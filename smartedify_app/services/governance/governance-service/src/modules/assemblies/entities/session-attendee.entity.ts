import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AssemblySession } from './assembly-session.entity';

export enum ValidationMethod {
  QR_PRESENTED = 'QR_PRESENTED',
  QR_SCANNED = 'QR_SCANNED',
  BIOMETRIC = 'BIOMETRIC',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  MANUAL = 'MANUAL',
}

@Entity('session_attendees')
@Index(['tenantId', 'sessionId', 'userId'], { unique: true })
export class SessionAttendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'validation_method',
    type: 'enum',
    enum: ValidationMethod,
  })
  validationMethod: ValidationMethod;

  @Column({ name: 'validation_hash', type: 'text', nullable: true })
  validationHash?: string;

  @Column({ name: 'validated_at', type: 'timestamptz' })
  validatedAt: Date;

  @Column({ name: 'is_present', type: 'boolean', default: true })
  isPresent: boolean;

  @Column({ name: 'left_at', type: 'timestamptz', nullable: true })
  leftAt?: Date;

  // Relations
  @ManyToOne(() => AssemblySession, (session) => session.attendees, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'session_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  session: AssemblySession;

  // Business methods
  markAsPresent(): void {
    this.isPresent = true;
    this.leftAt = null;
  }

  markAsLeft(): void {
    this.isPresent = false;
    this.leftAt = new Date();
  }

  isValidatedBySecureMethod(): boolean {
    return [
      ValidationMethod.BIOMETRIC,
      ValidationMethod.QR_SCANNED,
    ].includes(this.validationMethod);
  }

  getAttendanceDuration(): number | null {
    if (!this.validatedAt) return null;
    
    const endTime = this.leftAt || new Date();
    return endTime.getTime() - this.validatedAt.getTime();
  }
}