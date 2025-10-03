import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum InvoiceType {
  RESERVATION = 'RESERVATION',
  MAINTENANCE = 'MAINTENANCE',
  PENALTY = 'PENALTY',
  SERVICE = 'SERVICE',
  OTHER = 'OTHER',
}

@Entity('invoices')
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'condominiumId'])
@Index(['status'])
@Index(['dueDate'])
@Index(['invoiceNumber'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'condominium_id' })
  condominiumId: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string;

  @Column({
    type: 'enum',
    enum: InvoiceType,
  })
  type: InvoiceType;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column('decimal', { precision: 12, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  tax: number;

  @Column('decimal', { precision: 12, scale: 2 })
  total: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ name: 'due_date' })
  dueDate: Date;

  @Column({ name: 'paid_at', nullable: true })
  paidAt?: Date;

  @Column({ nullable: true })
  description?: string;

  @Column('jsonb', { name: 'line_items' })
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}