import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryColumn,
  Index,
} from 'typeorm';

@Entity('idempotency_keys')
@Index(['createdAt'])
export class IdempotencyKey {
  @PrimaryColumn('uuid', { name: 'tenant_id' })
  tenantId: string;

  @PrimaryColumn()
  route: string;

  @PrimaryColumn()
  key: string;

  @Column({ name: 'response_status', nullable: true })
  responseStatus?: number;

  @Column('jsonb', { name: 'response_body', nullable: true })
  responseBody?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}