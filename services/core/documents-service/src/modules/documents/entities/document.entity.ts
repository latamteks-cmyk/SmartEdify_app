import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { DocumentVersion } from './document-version.entity';
import { DocumentSignature } from '../../signatures/entities/document-signature.entity';

export enum DocumentType {
  ASSEMBLY_MINUTES = 'ASSEMBLY_MINUTES',
  VOTING_RECORD = 'VOTING_RECORD',
  FINANCIAL_REPORT = 'FINANCIAL_REPORT',
  CONTRACT = 'CONTRACT',
  LEGAL_DOCUMENT = 'LEGAL_DOCUMENT',
  CERTIFICATE = 'CERTIFICATE',
  BALLOT_PHOTO = 'BALLOT_PHOTO',
  OTHER = 'OTHER',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  SIGNED = 'SIGNED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export enum DocumentCategory {
  GOVERNANCE = 'GOVERNANCE',
  FINANCIAL = 'FINANCIAL',
  LEGAL = 'LEGAL',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  TECHNICAL = 'TECHNICAL',
}

@Entity('documents')
@Index(['tenantId', 'type'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'category'])
@Index(['createdAt'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'condominium_id', type: 'uuid', nullable: true })
  condominiumId?: string;

  @Column({ name: 'assembly_id', type: 'uuid', nullable: true })
  assemblyId?: string;

  @Column({ name: 'voting_id', type: 'uuid', nullable: true })
  votingId?: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  type: DocumentType;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT,
  })
  status: DocumentStatus;

  @Column({
    type: 'enum',
    enum: DocumentCategory,
  })
  category: DocumentCategory;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId?: string;

  @Column({ name: 'country_code', length: 3, nullable: true })
  countryCode?: string;

  @Column({ length: 5, default: 'es' })
  language: string;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_size' })
  fileSize: number;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 's3_key' })
  s3Key: string;

  @Column({ name: 's3_bucket' })
  s3Bucket: string;

  @Column({ name: 'file_hash' })
  fileHash: string;

  @Column({ name: 'is_encrypted', default: true })
  isEncrypted: boolean;

  @Column('jsonb', { name: 'encryption_metadata', nullable: true })
  encryptionMetadata?: Record<string, any>;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => DocumentVersion, version => version.document)
  versions: DocumentVersion[];

  @OneToMany(() => DocumentSignature, signature => signature.document)
  signatures: DocumentSignature[];

  // Virtual properties
  get isPublished(): boolean {
    return this.status === DocumentStatus.PUBLISHED && !!this.publishedAt;
  }

  get isSigned(): boolean {
    return this.status === DocumentStatus.SIGNED;
  }

  get isExpired(): boolean {
    return !!this.expiresAt && this.expiresAt < new Date();
  }

  get currentVersion(): number {
    return this.versions?.length || 1;
  }
}