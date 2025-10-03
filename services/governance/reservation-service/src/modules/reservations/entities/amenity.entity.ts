import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('amenities')
@Unique(['tenantId', 'localCode'])
@Unique(['id', 'tenantId']) // Support for composite FK
@Index(['tenantId', 'condominiumId'])
export class Amenity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'condominium_id' })
  condominiumId: string;

  @Column({ name: 'local_code' })
  localCode: string;

  @Column()
  name: string;

  @Column({ default: 1 })
  capacity: number;

  @Column('interval', { name: 'min_duration', default: '30 minutes' })
  minDuration: string;

  @Column('interval', { name: 'max_duration', default: '4 hours' })
  maxDuration: string;

  @Column('interval', { name: 'advance_min', default: '1 hour' })
  advanceMin: string;

  @Column('interval', { name: 'advance_max', default: '90 days' })
  advanceMax: string;

  @Column({ name: 'check_in_required', default: false })
  checkInRequired: boolean;

  @Column({ name: 'check_in_window_min', default: 15 })
  checkInWindowMin: number;

  @Column('decimal', { 
    name: 'fee_amount', 
    precision: 12, 
    scale: 2, 
    default: 0 
  })
  feeAmount: number;

  @Column({ name: 'fee_currency', length: 3, default: 'PEN' })
  feeCurrency: string;

  @Column('jsonb', { default: {} })
  rules: Record<string, any>;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}