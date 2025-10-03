import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum DocumentType {
  REGULATION = 'REGULATION',
  POLICY = 'POLICY',
  MINUTES = 'MINUTES',
  CONTRACT = 'CONTRACT',
  OTHER = 'OTHER',
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('document_manifests')
@Unique(['tenantId', 'condominiumId', 'docId'])
@Index(['tenantId', 'condominiumId'])
@Index(['processingStatus'])
@Index(['documentType'])
@Index(['contentHash'])
@Index(['createdAt'])
export class DocumentManifest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'condominium_id' })
  condominiumId: string;

  @Column('uuid', { name: 'doc_id' })
  docId: string;

  @Column({ length: 255 })
  filename: string;

  @Column({ name: 'content_hash', length: 64 })
  contentHash: string;

  @Column('bigint', { name: 'file_size' })
  fileSize: number;

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ length: 2, default: 'es' })
  language: string;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: DocumentType,
  })
  documentType: DocumentType;

  @Column({
    name: 'processing_status',
    type: 'enum',
    enum: ProcessingStatus,
    default: ProcessingStatus.PENDING,
  })
  processingStatus: ProcessingStatus;

  @Column({ name: 'chunk_count', default: 0 })
  chunkCount: number;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}