import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ComplianceJobService } from './compliance-job-service.entity';
import {
  ComplianceJobStatus,
  ComplianceJobType,
} from '../types/compliance-job.enums';

@Entity('compliance_jobs')
export class ComplianceJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column('uuid')
  tenant_id: string;

  @Column({ type: 'varchar' })
  type: ComplianceJobType;

  @Column({ type: 'varchar', default: ComplianceJobStatus.PENDING })
  status: ComplianceJobStatus;

  @Column('text', { array: true, default: () => 'ARRAY[]::text[]' })
  affected_services: string[];

  @Column({ type: 'text' })
  status_callback_url: string;

  @Column({ type: 'text', nullable: true })
  result_callback_url?: string;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_notified_at?: Date;

  @Column({ type: 'varchar', nullable: true })
  last_notification_status?: ComplianceJobStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => ComplianceJobService, (service) => service.job, {
    cascade: true,
  })
  services: ComplianceJobService[];
}
