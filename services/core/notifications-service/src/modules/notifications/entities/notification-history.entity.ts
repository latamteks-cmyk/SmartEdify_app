import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Notification, NotificationStatus } from './notification.entity';

export enum HistoryAction {
  CREATED = 'CREATED',
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETRIED = 'RETRIED',
  CANCELLED = 'CANCELLED',
  UPDATED = 'UPDATED',
}

@Entity('notification_history')
@Index(['tenantId', 'notificationId'])
@Index(['tenantId', 'action'])
@Index(['createdAt'])
export class NotificationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId: string;

  @Column({
    type: 'enum',
    enum: HistoryAction,
  })
  action: HistoryAction;

  @Column({
    name: 'previous_status',
    type: 'enum',
    enum: NotificationStatus,
    nullable: true,
  })
  previousStatus?: NotificationStatus;

  @Column({
    name: 'new_status',
    type: 'enum',
    enum: NotificationStatus,
    nullable: true,
  })
  newStatus?: NotificationStatus;

  @Column('text', { nullable: true })
  details?: string;

  @Column('jsonb', { name: 'context_data', default: {} })
  contextData: Record<string, any>;

  @Column({ name: 'error_message', nullable: true })
  errorMessage?: string;

  @Column({ name: 'error_code', nullable: true })
  errorCode?: string;

  @Column('jsonb', { name: 'provider_response', nullable: true })
  providerResponse?: Record<string, any>;

  @Column({ name: 'processing_time_ms', nullable: true })
  processingTimeMs?: number;

  @Column({ name: 'retry_attempt', default: 0 })
  retryAttempt: number;

  @Column({ name: 'channel_id', type: 'uuid', nullable: true })
  channelId?: string;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Notification)
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  // Virtual properties
  get isError(): boolean {
    return this.action === HistoryAction.FAILED || !!this.errorMessage;
  }

  get isSuccess(): boolean {
    return [HistoryAction.SENT, HistoryAction.DELIVERED].includes(this.action);
  }
}