import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Document, DocumentStatus, DocumentType } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { StorageService } from '../../storage/services/storage.service';
import { TemplateService } from '../../templates/services/template.service';
import { AiService } from './ai.service';

export interface CreateDocumentDto {
  tenantId: string;
  condominiumId?: string;
  assemblyId?: string;
  votingId?: string;
  title: string;
  description?: string;
  type: DocumentType;
  category: string;
  templateId?: string;
  countryCode?: string;
  language?: string;
  file?: Express.Multer.File;
  templateData?: Record<string, any>;
  metadata?: Record<string, any>;
  createdBy: string;
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepository: Repository<DocumentVersion>,
    private readonly storageService: StorageService,
    private readonly templateService: TemplateService,
    private readonly aiService: AiService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createDocument(createDto: CreateDocumentDto): Promise<Document> {
    let fileInfo: any;
    let documentContent: string;

    if (createDto.templateId && createDto.templateData) {
      // Generate document from template
      const template = await this.templateService.findById(createDto.templateId, createDto.tenantId);
      if (!template) {
        throw new NotFoundException('Template not found');
      }

      // Use AI to enhance content if available
      if (template.hasAiIntegration && createDto.templateData) {
        documentContent = await this.aiService.generateDocumentContent(
          template,
          createDto.templateData,
        );
      } else {
        documentContent = this.templateService.processTemplate(
          template.templateContent,
          createDto.templateData,
        );
      }

      // Convert to PDF and upload
      const pdfBuffer = await this.aiService.convertToPdf(documentContent, template.cssStyles);
      fileInfo = await this.storageService.uploadFile(
        pdfBuffer,
        `${createDto.title}.pdf`,
        'application/pdf',
        createDto.tenantId,
      );
    } else if (createDto.file) {
      // Upload provided file
      fileInfo = await this.storageService.uploadFile(
        createDto.file.buffer,
        createDto.file.originalname,
        createDto.file.mimetype,
        createDto.tenantId,
      );
    } else {
      throw new BadRequestException('Either template data or file must be provided');
    }

    const document = this.documentRepository.create({
      ...createDto,
      fileName: fileInfo.fileName,
      fileSize: fileInfo.fileSize,
      mimeType: fileInfo.mimeType,
      s3Key: fileInfo.s3Key,
      s3Bucket: fileInfo.s3Bucket,
      fileHash: fileInfo.fileHash,
      isEncrypted: fileInfo.isEncrypted,
      encryptionMetadata: fileInfo.encryptionMetadata,
      status: DocumentStatus.DRAFT,
    });

    const savedDocument = await this.documentRepository.save(document);

    // Create initial version
    await this.createVersion(savedDocument, 'INITIAL', 'Initial document creation');

    // Emit event
    this.eventEmitter.emit('document.created', {
      documentId: savedDocument.id,
      tenantId: savedDocument.tenantId,
      type: savedDocument.type,
      createdBy: savedDocument.createdBy,
    });

    return savedDocument;
  }

  async updateDocument(
    documentId: string,
    tenantId: string,
    updateData: Partial<Document>,
    file?: Express.Multer.File,
  ): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status === DocumentStatus.SIGNED) {
      throw new BadRequestException('Cannot update signed document');
    }

    let fileInfo: any;
    if (file) {
      // Upload new version
      fileInfo = await this.storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        tenantId,
      );

      // Create new version
      await this.createVersion(document, 'REVISION', 'Document updated with new file');
    }

    Object.assign(document, updateData);
    if (fileInfo) {
      Object.assign(document, {
        fileName: fileInfo.fileName,
        fileSize: fileInfo.fileSize,
        mimeType: fileInfo.mimeType,
        s3Key: fileInfo.s3Key,
        s3Bucket: fileInfo.s3Bucket,
        fileHash: fileInfo.fileHash,
      });
    }

    const updatedDocument = await this.documentRepository.save(document);

    this.eventEmitter.emit('document.updated', {
      documentId: updatedDocument.id,
      tenantId: updatedDocument.tenantId,
      changes: updateData,
    });

    return updatedDocument;
  }

  async publishDocument(documentId: string, tenantId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, tenantId },
      relations: ['signatures'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check if all required signatures are completed
    const requiredSignatures = document.signatures.filter(s => s.isRequired);
    const completedSignatures = requiredSignatures.filter(s => s.isSigned);

    if (requiredSignatures.length > 0 && completedSignatures.length !== requiredSignatures.length) {
      throw new BadRequestException('All required signatures must be completed before publishing');
    }

    document.status = DocumentStatus.PUBLISHED;
    document.publishedAt = new Date();

    const publishedDocument = await this.documentRepository.save(document);

    this.eventEmitter.emit('document.published', {
      documentId: publishedDocument.id,
      tenantId: publishedDocument.tenantId,
      publishedAt: publishedDocument.publishedAt,
    });

    return publishedDocument;
  }

  async getDocument(documentId: string, tenantId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, tenantId },
      relations: ['versions', 'signatures'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async getDocuments(
    tenantId: string,
    filters?: {
      type?: DocumentType;
      status?: DocumentStatus;
      category?: string;
      condominiumId?: string;
      assemblyId?: string;
      createdBy?: string;
    },
    pagination?: { limit: number; offset: number },
  ): Promise<{ documents: Document[]; total: number }> {
    const queryBuilder = this.documentRepository.createQueryBuilder('document')
      .where('document.tenantId = :tenantId', { tenantId })
      .andWhere('document.deletedAt IS NULL');

    if (filters) {
      if (filters.type) {
        queryBuilder.andWhere('document.type = :type', { type: filters.type });
      }
      if (filters.status) {
        queryBuilder.andWhere('document.status = :status', { status: filters.status });
      }
      if (filters.category) {
        queryBuilder.andWhere('document.category = :category', { category: filters.category });
      }
      if (filters.condominiumId) {
        queryBuilder.andWhere('document.condominiumId = :condominiumId', { condominiumId: filters.condominiumId });
      }
      if (filters.assemblyId) {
        queryBuilder.andWhere('document.assemblyId = :assemblyId', { assemblyId: filters.assemblyId });
      }
      if (filters.createdBy) {
        queryBuilder.andWhere('document.createdBy = :createdBy', { createdBy: filters.createdBy });
      }
    }

    queryBuilder.orderBy('document.createdAt', 'DESC');

    if (pagination) {
      queryBuilder.limit(pagination.limit).offset(pagination.offset);
    }

    const [documents, total] = await queryBuilder.getManyAndCount();

    return { documents, total };
  }

  async getDocumentDownloadUrl(documentId: string, tenantId: string): Promise<string> {
    const document = await this.getDocument(documentId, tenantId);
    return this.storageService.getPresignedUrl(document.s3Key, document.s3Bucket);
  }

  async deleteDocument(documentId: string, tenantId: string): Promise<void> {
    const document = await this.getDocument(documentId, tenantId);

    if (document.status === DocumentStatus.SIGNED) {
      throw new BadRequestException('Cannot delete signed document');
    }

    document.status = DocumentStatus.DELETED;
    document.deletedAt = new Date();

    await this.documentRepository.save(document);

    this.eventEmitter.emit('document.deleted', {
      documentId: document.id,
      tenantId: document.tenantId,
      deletedAt: document.deletedAt,
    });
  }

  private async createVersion(
    document: Document,
    versionType: string,
    changeSummary: string,
  ): Promise<DocumentVersion> {
    const existingVersions = await this.versionRepository.count({
      where: { documentId: document.id },
    });

    // Mark previous version as not current
    await this.versionRepository.update(
      { documentId: document.id, isCurrent: true },
      { isCurrent: false },
    );

    const version = this.versionRepository.create({
      tenantId: document.tenantId,
      documentId: document.id,
      version: existingVersions + 1,
      versionType: versionType as any,
      changeSummary,
      fileName: document.fileName,
      fileSize: document.fileSize,
      s3Key: document.s3Key,
      fileHash: document.fileHash,
      createdBy: document.createdBy,
      isCurrent: true,
    });

    return this.versionRepository.save(version);
  }
}