import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentService } from './document.service';
import { Document, DocumentStatus, DocumentType } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { StorageService } from '../../storage/services/storage.service';
import { TemplateService } from '../../templates/services/template.service';
import { AiService } from './ai.service';

describe('DocumentService', () => {
  let service: DocumentService;
  let documentRepository: Repository<Document>;
  let versionRepository: Repository<DocumentVersion>;
  let storageService: StorageService;
  let templateService: TemplateService;
  let aiService: AiService;
  let eventEmitter: EventEmitter2;

  const mockDocumentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockVersionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
    getPresignedUrl: jest.fn(),
  };

  const mockTemplateService = {
    findById: jest.fn(),
    processTemplate: jest.fn(),
  };

  const mockAiService = {
    generateDocumentContent: jest.fn(),
    convertToPdf: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
        {
          provide: getRepositoryToken(DocumentVersion),
          useValue: mockVersionRepository,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: TemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    documentRepository = module.get<Repository<Document>>(getRepositoryToken(Document));
    versionRepository = module.get<Repository<DocumentVersion>>(getRepositoryToken(DocumentVersion));
    storageService = module.get<StorageService>(StorageService);
    templateService = module.get<TemplateService>(TemplateService);
    aiService = module.get<AiService>(AiService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDocument', () => {
    it('should create document from template with AI generation', async () => {
      const createDto = {
        tenantId: 'tenant-1',
        title: 'Test Assembly Minutes',
        type: DocumentType.ASSEMBLY_MINUTES,
        category: 'GOVERNANCE',
        templateId: 'template-1',
        templateData: { assembly_title: 'Monthly Assembly' },
        createdBy: 'user-1',
      };

      const mockTemplate = {
        id: 'template-1',
        templateContent: '<h1>{{assembly_title}}</h1>',
        cssStyles: 'body { font-family: Arial; }',
        hasAiIntegration: true,
      };

      const mockGeneratedContent = '<h1>Monthly Assembly</h1><p>AI generated content...</p>';
      const mockPdfBuffer = Buffer.from('pdf-content');
      const mockFileInfo = {
        fileName: 'Test Assembly Minutes.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        s3Key: 'tenant-1/documents/test.pdf',
        s3Bucket: 'smartedify-documents',
        fileHash: 'hash123',
        isEncrypted: true,
        encryptionMetadata: {},
      };

      const mockDocument = {
        id: 'document-1',
        ...createDto,
        ...mockFileInfo,
        status: DocumentStatus.DRAFT,
      };

      mockTemplateService.findById.mockResolvedValue(mockTemplate);
      mockAiService.generateDocumentContent.mockResolvedValue(mockGeneratedContent);
      mockAiService.convertToPdf.mockResolvedValue(mockPdfBuffer);
      mockStorageService.uploadFile.mockResolvedValue(mockFileInfo);
      mockDocumentRepository.create.mockReturnValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(mockDocument);

      // Mock createVersion method
      jest.spyOn(service as any, 'createVersion').mockResolvedValue({});

      const result = await service.createDocument(createDto);

      expect(mockTemplateService.findById).toHaveBeenCalledWith('template-1', 'tenant-1');
      expect(mockAiService.generateDocumentContent).toHaveBeenCalledWith(mockTemplate, createDto.templateData);
      expect(mockAiService.convertToPdf).toHaveBeenCalledWith(mockGeneratedContent, mockTemplate.cssStyles);
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        mockPdfBuffer,
        'Test Assembly Minutes.pdf',
        'application/pdf',
        'tenant-1'
      );
      expect(mockDocumentRepository.create).toHaveBeenCalledWith({
        ...createDto,
        ...mockFileInfo,
        status: DocumentStatus.DRAFT,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('document.created', expect.any(Object));
      expect(result).toEqual(mockDocument);
    });

    it('should create document from uploaded file', async () => {
      const mockFile = {
        buffer: Buffer.from('file-content'),
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      const createDto = {
        tenantId: 'tenant-1',
        title: 'Uploaded Document',
        type: DocumentType.CONTRACT,
        category: 'LEGAL',
        file: mockFile,
        createdBy: 'user-1',
      };

      const mockFileInfo = {
        fileName: 'document.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        s3Key: 'tenant-1/documents/document.pdf',
        s3Bucket: 'smartedify-documents',
        fileHash: 'hash456',
        isEncrypted: true,
        encryptionMetadata: {},
      };

      const mockDocument = {
        id: 'document-2',
        ...createDto,
        ...mockFileInfo,
        status: DocumentStatus.DRAFT,
      };

      mockStorageService.uploadFile.mockResolvedValue(mockFileInfo);
      mockDocumentRepository.create.mockReturnValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(mockDocument);

      // Mock createVersion method
      jest.spyOn(service as any, 'createVersion').mockResolvedValue({});

      const result = await service.createDocument(createDto);

      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype,
        'tenant-1'
      );
      expect(mockDocumentRepository.create).toHaveBeenCalledWith({
        ...createDto,
        ...mockFileInfo,
        status: DocumentStatus.DRAFT,
      });
      expect(result).toEqual(mockDocument);
    });

    it('should throw BadRequestException when neither template nor file provided', async () => {
      const createDto = {
        tenantId: 'tenant-1',
        title: 'Invalid Document',
        type: DocumentType.OTHER,
        category: 'ADMINISTRATIVE',
        createdBy: 'user-1',
      };

      await expect(service.createDocument(createDto)).rejects.toThrow(
        'Either template data or file must be provided'
      );
    });

    it('should throw NotFoundException when template not found', async () => {
      const createDto = {
        tenantId: 'tenant-1',
        title: 'Test Document',
        type: DocumentType.ASSEMBLY_MINUTES,
        category: 'GOVERNANCE',
        templateId: 'non-existent-template',
        templateData: {},
        createdBy: 'user-1',
      };

      mockTemplateService.findById.mockResolvedValue(null);

      await expect(service.createDocument(createDto)).rejects.toThrow('Template not found');
    });
  });

  describe('publishDocument', () => {
    it('should publish document when all required signatures are completed', async () => {
      const documentId = 'document-1';
      const tenantId = 'tenant-1';

      const mockDocument = {
        id: documentId,
        tenantId,
        status: DocumentStatus.PENDING_SIGNATURE,
        signatures: [
          { id: 'sig-1', isRequired: true, isSigned: true },
          { id: 'sig-2', isRequired: true, isSigned: true },
          { id: 'sig-3', isRequired: false, isSigned: false },
        ],
      };

      const publishedDocument = {
        ...mockDocument,
        status: DocumentStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      };

      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);
      mockDocumentRepository.save.mockResolvedValue(publishedDocument);

      const result = await service.publishDocument(documentId, tenantId);

      expect(mockDocumentRepository.findOne).toHaveBeenCalledWith({
        where: { id: documentId, tenantId },
        relations: ['signatures'],
      });
      expect(mockDocumentRepository.save).toHaveBeenCalledWith({
        ...mockDocument,
        status: DocumentStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('document.published', expect.any(Object));
      expect(result).toEqual(publishedDocument);
    });

    it('should throw BadRequestException when required signatures are missing', async () => {
      const documentId = 'document-1';
      const tenantId = 'tenant-1';

      const mockDocument = {
        id: documentId,
        tenantId,
        status: DocumentStatus.PENDING_SIGNATURE,
        signatures: [
          { id: 'sig-1', isRequired: true, isSigned: true },
          { id: 'sig-2', isRequired: true, isSigned: false }, // Missing signature
        ],
      };

      mockDocumentRepository.findOne.mockResolvedValue(mockDocument);

      await expect(service.publishDocument(documentId, tenantId)).rejects.toThrow(
        'All required signatures must be completed before publishing'
      );
    });

    it('should throw NotFoundException when document not found', async () => {
      const documentId = 'non-existent';
      const tenantId = 'tenant-1';

      mockDocumentRepository.findOne.mockResolvedValue(null);

      await expect(service.publishDocument(documentId, tenantId)).rejects.toThrow('Document not found');
    });
  });

  describe('getDocuments', () => {
    it('should return documents with filters and pagination', async () => {
      const tenantId = 'tenant-1';
      const filters = {
        type: DocumentType.ASSEMBLY_MINUTES,
        status: DocumentStatus.PUBLISHED,
        condominiumId: 'condo-1',
      };
      const pagination = { limit: 10, offset: 0 };

      const mockDocuments = [
        { id: 'doc-1', type: DocumentType.ASSEMBLY_MINUTES },
        { id: 'doc-2', type: DocumentType.ASSEMBLY_MINUTES },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockDocuments, 2]),
      };

      mockDocumentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getDocuments(tenantId, filters, pagination);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('document.tenantId = :tenantId', { tenantId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('document.deletedAt IS NULL');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('document.type = :type', { type: filters.type });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('document.status = :status', { status: filters.status });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('document.condominiumId = :condominiumId', { condominiumId: filters.condominiumId });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0);
      expect(result).toEqual({ documents: mockDocuments, total: 2 });
    });
  });

  describe('deleteDocument', () => {
    it('should soft delete document successfully', async () => {
      const documentId = 'document-1';
      const tenantId = 'tenant-1';

      const mockDocument = {
        id: documentId,
        tenantId,
        status: DocumentStatus.DRAFT,
      };

      const deletedDocument = {
        ...mockDocument,
        status: DocumentStatus.DELETED,
        deletedAt: expect.any(Date),
      };

      // Mock getDocument method
      jest.spyOn(service, 'getDocument').mockResolvedValue(mockDocument as any);
      mockDocumentRepository.save.mockResolvedValue(deletedDocument);

      await service.deleteDocument(documentId, tenantId);

      expect(mockDocumentRepository.save).toHaveBeenCalledWith({
        ...mockDocument,
        status: DocumentStatus.DELETED,
        deletedAt: expect.any(Date),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('document.deleted', expect.any(Object));
    });

    it('should throw BadRequestException when trying to delete signed document', async () => {
      const documentId = 'document-1';
      const tenantId = 'tenant-1';

      const mockDocument = {
        id: documentId,
        tenantId,
        status: DocumentStatus.SIGNED,
      };

      // Mock getDocument method
      jest.spyOn(service, 'getDocument').mockResolvedValue(mockDocument as any);

      await expect(service.deleteDocument(documentId, tenantId)).rejects.toThrow(
        'Cannot delete signed document'
      );
    });
  });
});