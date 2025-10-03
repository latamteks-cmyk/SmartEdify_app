import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentSignature, SignatureStatus, SignerRole, SignatureType } from '../entities/document-signature.entity';
import { Document } from '../../documents/entities/document.entity';

export interface CreateSignatureDto {
  tenantId: string;
  documentId: string;
  signerId: string;
  signerName: string;
  signerEmail: string;
  signerRole: SignerRole;
  signatureType?: SignatureType;
  signingOrder?: number;
  isRequired?: boolean;
  expiresAt?: Date;
}

export interface SignDocumentDto {
  signatureData: string;
  signatureMetadata?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    biometricData?: string;
  };
}

@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  constructor(
    @InjectRepository(DocumentSignature)
    private readonly signatureRepository: Repository<DocumentSignature>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createSignature(createDto: CreateSignatureDto): Promise<DocumentSignature> {
    // Verify document exists
    const document = await this.documentRepository.findOne({
      where: { id: createDto.documentId, tenantId: createDto.tenantId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check if signature already exists for this signer
    const existingSignature = await this.signatureRepository.findOne({
      where: {
        documentId: createDto.documentId,
        signerId: createDto.signerId,
      },
    });

    if (existingSignature) {
      throw new BadRequestException('Signature already exists for this signer');
    }

    const signature = this.signatureRepository.create({
      ...createDto,
      signatureType: createDto.signatureType || SignatureType.ELECTRONIC,
      signingOrder: createDto.signingOrder || 1,
      isRequired: createDto.isRequired !== false,
      status: SignatureStatus.PENDING,
    });

    const savedSignature = await this.signatureRepository.save(signature);

    // Emit event
    this.eventEmitter.emit('signature.created', {
      signatureId: savedSignature.id,
      documentId: savedSignature.documentId,
      tenantId: savedSignature.tenantId,
      signerId: savedSignature.signerId,
    });

    return savedSignature;
  }

  async signDocument(
    signatureId: string,
    tenantId: string,
    signDto: SignDocumentDto,
  ): Promise<DocumentSignature> {
    const signature = await this.signatureRepository.findOne({
      where: { id: signatureId, tenantId },
      relations: ['document'],
    });

    if (!signature) {
      throw new NotFoundException('Signature not found');
    }

    if (!signature.canSign) {
      throw new BadRequestException('Signature cannot be completed at this time');
    }

    // Check signing order
    if (signature.signingOrder > 1) {
      const previousSignatures = await this.signatureRepository.find({
        where: {
          documentId: signature.documentId,
          signingOrder: signature.signingOrder - 1,
        },
      });

      const allPreviousSigned = previousSignatures.every(s => s.isSigned);
      if (!allPreviousSigned) {
        throw new BadRequestException('Previous signatures must be completed first');
      }
    }

    // Update signature
    signature.status = SignatureStatus.SIGNED;
    signature.signedAt = new Date();
    signature.signatureData = signDto.signatureData;
    signature.signatureMetadata = {
      ...signature.signatureMetadata,
      ...signDto.signatureMetadata,
      timestamp: new Date().toISOString(),
    };

    const signedSignature = await this.signatureRepository.save(signature);

    // Check if all required signatures are completed
    await this.checkDocumentSignatureCompletion(signature.documentId);

    // Emit event
    this.eventEmitter.emit('signature.signed', {
      signatureId: signedSignature.id,
      documentId: signedSignature.documentId,
      tenantId: signedSignature.tenantId,
      signerId: signedSignature.signerId,
      signedAt: signedSignature.signedAt,
    });

    return signedSignature;
  }

  async rejectSignature(
    signatureId: string,
    tenantId: string,
    reason: string,
  ): Promise<DocumentSignature> {
    const signature = await this.signatureRepository.findOne({
      where: { id: signatureId, tenantId },
    });

    if (!signature) {
      throw new NotFoundException('Signature not found');
    }

    if (signature.status !== SignatureStatus.PENDING) {
      throw new BadRequestException('Only pending signatures can be rejected');
    }

    signature.status = SignatureStatus.REJECTED;
    signature.rejectionReason = reason;

    const rejectedSignature = await this.signatureRepository.save(signature);

    // Emit event
    this.eventEmitter.emit('signature.rejected', {
      signatureId: rejectedSignature.id,
      documentId: rejectedSignature.documentId,
      tenantId: rejectedSignature.tenantId,
      signerId: rejectedSignature.signerId,
      reason,
    });

    return rejectedSignature;
  }

  async getDocumentSignatures(documentId: string, tenantId: string): Promise<DocumentSignature[]> {
    return this.signatureRepository.find({
      where: { documentId, tenantId },
      order: { signingOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async getUserSignatures(
    tenantId: string,
    signerId: string,
    status?: SignatureStatus,
  ): Promise<DocumentSignature[]> {
    const whereCondition: any = { tenantId, signerId };
    if (status) {
      whereCondition.status = status;
    }

    return this.signatureRepository.find({
      where: whereCondition,
      relations: ['document'],
      order: { createdAt: 'DESC' },
    });
  }

  async sendSignatureReminder(signatureId: string, tenantId: string): Promise<void> {
    const signature = await this.signatureRepository.findOne({
      where: { id: signatureId, tenantId },
    });

    if (!signature) {
      throw new NotFoundException('Signature not found');
    }

    if (signature.status !== SignatureStatus.PENDING) {
      throw new BadRequestException('Only pending signatures can receive reminders');
    }

    signature.reminderCount += 1;
    signature.lastReminderAt = new Date();

    await this.signatureRepository.save(signature);

    // Emit event for notification service
    this.eventEmitter.emit('signature.reminder', {
      signatureId: signature.id,
      documentId: signature.documentId,
      tenantId: signature.tenantId,
      signerId: signature.signerId,
      signerEmail: signature.signerEmail,
      reminderCount: signature.reminderCount,
    });
  }

  async cancelSignature(signatureId: string, tenantId: string): Promise<DocumentSignature> {
    const signature = await this.signatureRepository.findOne({
      where: { id: signatureId, tenantId },
    });

    if (!signature) {
      throw new NotFoundException('Signature not found');
    }

    if (signature.status === SignatureStatus.SIGNED) {
      throw new BadRequestException('Cannot cancel completed signature');
    }

    signature.status = SignatureStatus.CANCELLED;

    const cancelledSignature = await this.signatureRepository.save(signature);

    // Emit event
    this.eventEmitter.emit('signature.cancelled', {
      signatureId: cancelledSignature.id,
      documentId: cancelledSignature.documentId,
      tenantId: cancelledSignature.tenantId,
      signerId: cancelledSignature.signerId,
    });

    return cancelledSignature;
  }

  async getSignatureStatus(documentId: string, tenantId: string): Promise<{
    totalSignatures: number;
    requiredSignatures: number;
    completedSignatures: number;
    pendingSignatures: number;
    isComplete: boolean;
    nextSigner?: {
      signerId: string;
      signerName: string;
      signerEmail: string;
      signingOrder: number;
    };
  }> {
    const signatures = await this.getDocumentSignatures(documentId, tenantId);

    const totalSignatures = signatures.length;
    const requiredSignatures = signatures.filter(s => s.isRequired).length;
    const completedSignatures = signatures.filter(s => s.isSigned).length;
    const pendingSignatures = signatures.filter(s => s.isPending).length;

    const completedRequired = signatures.filter(s => s.isRequired && s.isSigned).length;
    const isComplete = completedRequired === requiredSignatures;

    // Find next signer in order
    const nextPendingSignature = signatures
      .filter(s => s.isPending)
      .sort((a, b) => a.signingOrder - b.signingOrder)[0];

    const nextSigner = nextPendingSignature ? {
      signerId: nextPendingSignature.signerId,
      signerName: nextPendingSignature.signerName,
      signerEmail: nextPendingSignature.signerEmail,
      signingOrder: nextPendingSignature.signingOrder,
    } : undefined;

    return {
      totalSignatures,
      requiredSignatures,
      completedSignatures,
      pendingSignatures,
      isComplete,
      nextSigner,
    };
  }

  private async checkDocumentSignatureCompletion(documentId: string): Promise<void> {
    const signatures = await this.signatureRepository.find({
      where: { documentId },
    });

    const requiredSignatures = signatures.filter(s => s.isRequired);
    const completedRequired = requiredSignatures.filter(s => s.isSigned);

    if (completedRequired.length === requiredSignatures.length) {
      // All required signatures completed
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
      });

      if (document) {
        document.status = 'SIGNED' as any;
        await this.documentRepository.save(document);

        // Emit event
        this.eventEmitter.emit('document.fully_signed', {
          documentId: document.id,
          tenantId: document.tenantId,
          completedAt: new Date(),
        });
      }
    }
  }
}