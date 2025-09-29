import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ComplianceJob } from './compliance-job.entity';
import { ComplianceJobServiceStatus } from '../types/compliance-job.enums';

@Entity('compliance_job_services')
@Unique(['job_id', 'service_name'])
export class ComplianceJobService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  job_id: string;

  @ManyToOne(() => ComplianceJob, (job) => job.services, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'job_id' })
  job: ComplianceJob;

  @Column({ type: 'varchar' })
  service_name: string;

  @Column({ type: 'varchar', default: ComplianceJobServiceStatus.PENDING })
  status: ComplianceJobServiceStatus;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at?: Date;

  @Column({ type: 'text', nullable: true })
  error_message?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
