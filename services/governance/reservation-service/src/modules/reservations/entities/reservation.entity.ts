import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumns,
  OneToOne,
} from 'typeorm';
import { Amenity } from './amenity.entity';
import { Attendance } from './attendance.entity';

export enum ReservationStatus {
  PENDING_UNPAID = 'PENDING_UNPAID',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

@Entity('reservations')
@Index(['tenantId', 'amenityId'])
@Index(['tenantId', 'userId'])
@Index(['status'])
@Index(['createdAt'])
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'condominium_id' })
  condominiumId: string;

  @Column('uuid', { name: 'amenity_id' })
  amenityId: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING_UNPAID,
  })
  status: ReservationStatus;

  // Using custom type for PostgreSQL tstzrange
  @Column('tstzrange')
  time: string;

  @Column({ name: 'party_size', default: 1 })
  partySize: number;

  @Column('decimal', { 
    name: 'price_amount', 
    precision: 12, 
    scale: 2, 
    default: 0 
  })
  priceAmount: number;

  @Column({ name: 'price_currency', length: 3, default: 'PEN' })
  priceCurrency: string;

  @Column({ name: 'requires_approval', default: false })
  requiresApproval: boolean;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy?: string;

  @Column({ name: 'approved_at', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'reason_cancel', nullable: true })
  reasonCancel?: string;

  @Column('bigint', { default: 1 })
  version: number;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Amenity, { onDelete: 'CASCADE' })
  @JoinColumns([
    { name: 'amenity_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  amenity: Amenity;

  @OneToOne(() => Attendance, attendance => attendance.reservation)
  attendance?: Attendance;
}