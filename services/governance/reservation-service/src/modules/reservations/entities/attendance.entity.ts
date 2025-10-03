import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumns,
  Unique,
} from 'typeorm';
import { Reservation } from './reservation.entity';

export enum CheckInMethod {
  QR = 'QR',
  BIOMETRIC = 'BIOMETRIC',
  SMS = 'SMS',
  MANUAL = 'MANUAL',
}

@Entity('attendances')
@Unique(['tenantId', 'reservationId'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'reservation_id' })
  reservationId: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'check_in_at', nullable: true })
  checkInAt?: Date;

  @Column({ name: 'check_out_at', nullable: true })
  checkOutAt?: Date;

  @Column({
    type: 'enum',
    enum: CheckInMethod,
  })
  method: CheckInMethod;

  @Column({ name: 'validation_hash', nullable: true })
  validationHash?: string;

  @Column({ name: 'by_sub', nullable: true })
  bySub?: string;

  @OneToOne(() => Reservation, { onDelete: 'CASCADE' })
  @JoinColumns([
    { name: 'reservation_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  reservation: Reservation;
}