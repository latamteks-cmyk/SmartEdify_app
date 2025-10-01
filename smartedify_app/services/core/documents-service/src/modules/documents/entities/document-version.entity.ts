import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';

export enum VersionType {
  INITIAL = 'INITIAL',
  REVISION = 'REVISION',
  CORRECTION = 'CORRECTION',
  AMENDMENT = 'AMENDMENT',
  FINAL = 'FINAL',
}

@Entity('document_versions')
@Index(['tenantId', 'documentId'])
@Index(['tenantId', 'version'])
@Index(['createdAt'])
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column()
  version: number;

  @Column({
    name: 'version_type',
    type: 'enum',
    enum: VersionType,
    default: VersionType.REVISION,
  })
  versionType: VersionType;

  @Column({ name: 'change_summary', nullable: true })
  changeSummary?: string;

  @Column('text', { name: 'change_details', nullable: true })
  changeDetails?: string;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_size' })
  fileSize: number;

  @Column({ name: 's3_key' })
  s3Key: string;

  @Column({ name: 'file_hash' })
  fileHash: string;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'is_current', default: false })
  isCurrent: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Document, document => document.versions)
  @JoinColumn({ name: 'document_id' })
  document: Document;
}