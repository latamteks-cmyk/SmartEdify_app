import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Assembly } from './assembly.entity';

export enum ContributionMediaType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export enum ContributionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
}

@Entity('community_contributions')
export class CommunityContribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assembly_id', type: 'uuid' })
  assemblyId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    name: 'media_type',
    type: 'enum',
    enum: ContributionMediaType,
  })
  mediaType: ContributionMediaType;

  @Column({ name: 'media_url', type: 'text', nullable: true })
  mediaUrl?: string;

  @Column({
    type: 'enum',
    enum: ContributionStatus,
    default: ContributionStatus.PENDING,
  })
  status: ContributionStatus;

  @Column({ name: 'moderated_by', type: 'uuid', nullable: true })
  moderatedBy?: string;

  @Column({ name: 'moderated_at', type: 'timestamptz', nullable: true })
  moderatedAt?: Date;

  @Column({ name: 'moderation_reason', type: 'text', nullable: true })
  moderationReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Assembly, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'assembly_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  assembly: Assembly;

  // Business methods
  approve(moderatorId: string): void {
    this.status = ContributionStatus.APPROVED;
    this.moderatedBy = moderatorId;
    this.moderatedAt = new Date();
  }

  reject(moderatorId: string, reason: string): void {
    this.status = ContributionStatus.REJECTED;
    this.moderatedBy = moderatorId;
    this.moderatedAt = new Date();
    this.moderationReason = reason;
  }

  flag(moderatorId: string, reason: string): void {
    this.status = ContributionStatus.FLAGGED;
    this.moderatedBy = moderatorId;
    this.moderatedAt = new Date();
    this.moderationReason = reason;
  }

  isApproved(): boolean {
    return this.status === ContributionStatus.APPROVED;
  }

  hasMedia(): boolean {
    return !!this.mediaUrl && this.mediaType !== ContributionMediaType.TEXT;
  }
}