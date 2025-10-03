import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PolicyScope {
  RESERVATION = 'reservation',
  STREAMING = 'streaming',
  PRIVACY = 'privacy',
  SANCTIONS = 'sanctions',
}

export enum PolicyDraftStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
}

@Entity('policy_drafts')
@Index(['tenantId', 'condominiumId'])
@Index(['scope', 'status'])
@Index(['createdAt'])
export class PolicyDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'condominium_id', type: 'uuid' })
  condominiumId: string;

  @Column({
    type: 'enum',
    enum: PolicyScope,
  })
  scope: PolicyScope;

  @Column('jsonb')
  rules: Array<{
    action: string;
    condition: string;
    obligations?: Array<{ type: string; when?: string }>;
    exceptions?: string[];
    refs: string[];
  }>;

  @Column({ name: 'requires_human_review', default: false })
  requiresHumanReview: boolean;

  @Column({
    type: 'enum',
    enum: PolicyDraftStatus,
    default: PolicyDraftStatus.DRAFT,
  })
  status: PolicyDraftStatus;

  @Column({ name: 'grounding_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  groundingScore?: number;

  @Column('jsonb', { name: 'source_docs', default: [] })
  sourceDocs: string[];

  @Column({ name: 'prompt_hash', nullable: true })
  promptHash?: string;

  @Column({ name: 'completion_hash', nullable: true })
  completionHash?: string;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy?: string;

  @Column({ name: 'review_notes', nullable: true })
  reviewNotes?: string;

  @Column({ name: 'published_version', nullable: true })
  publishedVersion?: string;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}