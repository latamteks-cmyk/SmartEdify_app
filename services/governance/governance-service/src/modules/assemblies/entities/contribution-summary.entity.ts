import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Assembly } from './assembly.entity';

@Entity('contribution_summaries')
export class ContributionSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assembly_id', type: 'uuid' })
  assemblyId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'summary_text', type: 'text' })
  summaryText: string;

  @Column({ type: 'jsonb', nullable: true })
  topics?: Record<string, any>;

  @Column({ name: 'pdf_url', type: 'text', nullable: true })
  pdfUrl?: string;

  @Column({ name: 'generated_by_ai', type: 'boolean', default: true })
  generatedByAi: boolean;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'generated_at', type: 'timestamptz', default: () => 'NOW()' })
  generatedAt: Date;

  // Relations
  @ManyToOne(() => Assembly, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'assembly_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  assembly: Assembly;

  // Business methods
  markAsReviewed(reviewerId: string): void {
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
  }

  isReviewed(): boolean {
    return !!this.reviewedBy && !!this.reviewedAt;
  }

  getTopicCount(): number {
    return this.topics ? Object.keys(this.topics).length : 0;
  }

  addTopic(key: string, value: any): void {
    if (!this.topics) {
      this.topics = {};
    }
    this.topics[key] = value;
  }

  hasPdf(): boolean {
    return !!this.pdfUrl;
  }
}