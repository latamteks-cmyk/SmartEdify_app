import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum OperationType {
  COMPILE = 'COMPILE',
  EXPLAIN = 'EXPLAIN',
  SEARCH = 'SEARCH',
}

@Entity('llm_audit_log')
@Index(['tenantId', 'createdAt'])
@Index(['operationType', 'createdAt'])
@Index(['promptHash'])
@Index(['traceId'], { where: 'trace_id IS NOT NULL' })
@Index(['requestId'], { where: 'request_id IS NOT NULL' })
export class LlmAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'condominium_id', nullable: true })
  condominiumId?: string;

  @Column({
    name: 'operation_type',
    type: 'enum',
    enum: OperationType,
  })
  operationType: OperationType;

  @Column({ name: 'prompt_hash', length: 64 })
  promptHash: string;

  @Column({ name: 'completion_hash', length: 64, nullable: true })
  completionHash?: string;

  @Column({ name: 'input_tokens', nullable: true })
  inputTokens?: number;

  @Column({ name: 'output_tokens', nullable: true })
  outputTokens?: number;

  @Column({ name: 'processing_time_ms', nullable: true })
  processingTimeMs?: number;

  @Column('decimal', { 
    name: 'grounding_score', 
    precision: 3, 
    scale: 2, 
    nullable: true 
  })
  groundingScore?: number;

  @Column('jsonb', { name: 'chunks_cited', nullable: true })
  chunksCited?: Record<string, any>;

  @Column('uuid', { name: 'user_id', nullable: true })
  userId?: string;

  @Column('inet', { name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @Column('uuid', { name: 'request_id', nullable: true })
  requestId?: string;

  @Column({ name: 'trace_id', length: 32, nullable: true })
  traceId?: string;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}