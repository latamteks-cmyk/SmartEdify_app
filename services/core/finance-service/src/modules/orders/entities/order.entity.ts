import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
}

export enum OrderType {
  RESERVATION_FEE = 'RESERVATION_FEE',
  MAINTENANCE_FEE = 'MAINTENANCE_FEE',
  PENALTY = 'PENALTY',
  SERVICE_FEE = 'SERVICE_FEE',
  OTHER = 'OTHER',
}

@Entity('orders')
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'condominiumId'])
@Index(['status'])
@Index(['expiresAt'])
@Index(['createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'condominium_id' })
  condominiumId: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: OrderType,
  })
  type: OrderType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ nullable: true })
  description?: string;

  @Column('uuid', { name: 'reference_id', nullable: true })
  referenceId?: string; // e.g., reservation ID

  @Column({ name: 'reference_type', nullable: true })
  referenceType?: string; // e.g., 'reservation'

  @Column({ name: 'expires_at', nullable: true })
  expiresAt?: Date;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Payment, payment => payment.order)
  payments: Payment[];
}