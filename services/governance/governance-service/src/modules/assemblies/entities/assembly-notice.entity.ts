import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AssemblyInitiative } from './assembly-initiative.entity';

export enum NoticeStatus {
  DRAFT = 'DRAFT',
  EMITTED = 'EMITTED',
  SIGNED = 'SIGNED',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
}

@Entity('assembly_notices')
export class AssemblyNotice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'initiative_id', type: 'uuid' })
  initiativeId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'issued_by', type: 'uuid' })
  issuedBy: string;

  @Column({ name: 'scheduled_date', type: 'timestamptz' })
  scheduledDate: Date;

  @Column({ name: 'pdf_url', type: 'text', nullable: true })
  pdfUrl?: string;

  @Column({ name: 'hash_sha256', type: 'text', nullable: true })
  hashSha256?: string;

  @Column({
    type: 'enum',
    enum: NoticeStatus,
    default: NoticeStatus.DRAFT,
  })
  status: NoticeStatus;

  @Column({ name: 'emitted_at', type: 'timestamptz' })
  emittedAt: Date;

  @Column({ name: 'aliquot_snapshot', type: 'jsonb' })
  aliquotSnapshot: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => AssemblyInitiative, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'initiative_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  initiative: AssemblyInitiative;

  // Business methods
  canBePublished(): boolean {
    return this.status === NoticeStatus.SIGNED && this.pdfUrl && this.hashSha256;
  }

  markAsEmitted(): void {
    this.status = NoticeStatus.EMITTED;
    this.emittedAt = new Date();
  }

  markAsSigned(pdfUrl: string, hashSha256: string): void {
    this.pdfUrl = pdfUrl;
    this.hashSha256 = hashSha256;
    this.status = NoticeStatus.SIGNED;
  }
}