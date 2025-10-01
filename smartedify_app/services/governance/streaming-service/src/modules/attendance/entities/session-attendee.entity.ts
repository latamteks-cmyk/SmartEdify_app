import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AssemblySession } from '../../sessions/entities/assembly-session.entity';

export enum ValidationMethod {
  QR = 'qr',
  BIOMETRIC = 'biometric',
  SMS = 'sms',
  EMAIL = 'email',
  MANUAL = 'manual',
}

@Entity('session_attendees')
@Index(['tenantId', 'sessionId'])
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'validatedAt'])
@Unique(['tenantId', 'sessionId', 'userId'])
export class SessionAttendee {
  @ApiProperty({ description: 'Attendee record unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Session ID' })
  @Column({ name: 'session_id' })
  sessionId: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenancy' })
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @ApiProperty({ description: 'User ID from identity-service' })
  @Column({ name: 'user_id' })
  userId: string;

  @ApiProperty({ enum: ValidationMethod, description: 'Method used for validation' })
  @Column({
    type: 'enum',
    enum: ValidationMethod,
    name: 'validation_method',
  })
  validationMethod: ValidationMethod;

  @ApiProperty({ description: 'Hash of validation data (never store raw data)' })
  @Column({ name: 'validation_hash', nullable: true })
  validationHash?: string;

  @ApiProperty({ description: 'Timestamp when attendance was validated' })
  @Column({ name: 'validated_at', type: 'timestamptz' })
  validatedAt: Date;

  @ApiProperty({ description: 'Whether attendee is currently present' })
  @Column({ name: 'is_present', default: true })
  isPresent: boolean;

  @ApiProperty({ description: 'IP address used for validation' })
  @Column({ name: 'validation_ip', nullable: true })
  validationIp?: string;

  @ApiProperty({ description: 'User agent used for validation' })
  @Column({ name: 'validation_user_agent', nullable: true })
  validationUserAgent?: string;

  @ApiProperty({ description: 'Geolocation data (if available and consented)' })
  @Column({ name: 'geolocation', type: 'jsonb', nullable: true })
  geolocation?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };

  @ApiProperty({ description: 'Additional validation metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => AssemblySession, (session) => session.attendees, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: AssemblySession;

  // Business logic methods
  isValidatedBySecureMethod(): boolean {
    return [
      ValidationMethod.QR,
      ValidationMethod.BIOMETRIC,
    ].includes(this.validationMethod);
  }

  isValidatedByDigitalMethod(): boolean {
    return [
      ValidationMethod.SMS,
      ValidationMethod.EMAIL,
    ].includes(this.validationMethod);
  }

  isManuallyValidated(): boolean {
    return this.validationMethod === ValidationMethod.MANUAL;
  }

  getValidationAge(): number {
    return Date.now() - this.validatedAt.getTime();
  }
}