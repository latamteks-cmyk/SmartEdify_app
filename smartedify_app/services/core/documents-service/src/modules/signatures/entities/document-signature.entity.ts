import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Document } from '../../documents/entities/document.entity';

export enum SignatureType {
  ELECTRONIC = 'ELECTRONIC',
  DIGITAL = 'DIGITAL',
  BIOMETRIC = 'BIOMETRIC',
  HANDWRITTEN = 'HANDWRITTEN',
}

export enum SignatureStatus {
  PENDING = 'PENDING',
  SIGNED = 'SIGNED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum SignerRole {
  PRESIDENT = 'PRESIDENT',
  SECRETARY = 'SECRETARY',
  TREASURER = 'TREASURER',
  COUNCIL_MEMBER = 'COUNCIL_MEMBER',
  ADMINISTRATOR = 'ADMINISTRATOR',
  WITNESS = 'WITNESS',
  APPROVER = 'APPROVER',
}

@Entity('document_signatures')
@Index(['tenantId', 'documentId'])
@Index(['tenantId', 'signerId'])
@Index(['tenantId', 'status'])
@Index(['signingOrder'])
export class DocumentSignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'signer_id', type: 'uuid' })
  signerId: string;

  @Column({ name: 'signer_name' })
  signerName: string;

  @Column({ name: 'signer_email' })
  signerEmail: string;

  @Column({
    name: 'signer_role',
    type: 'enum',
    enum: SignerRole,
  })
  signerRole: SignerRole;

  @Column({
    name: 'signature_type',
    type: 'enum',
    enum: SignatureType,
    default: SignatureType.ELECTRONIC,
  })
  signatureType: SignatureType;

  @Column({
    type: 'enum',
    enum: SignatureStatus,
    default: SignatureStatus.PENDING,
  })
  status: SignatureStatus;

  @Column({ name: 'signing_order', default: 1 })
  signingOrder: number;

  @Column({ name: 'is_required', default: true })
  isRequired: boolean;

  @Column({ name: 'signature_data', nullable: true })
  signatureData?: string;

  @Column('jsonb', { name: 'signature_metadata', default: {} })
  signatureMetadata: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    timestamp?: string;
    certificate?: string;
    biometricData?: string;
  };

  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
  signedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'notification_sent', default: false })
  notificationSent: boolean;

  @Column({ name: 'reminder_count', default: 0 })
  reminderCount: number;

  @Column({ name: 'last_reminder_at', type: 'timestamptz', nullable: true })
  lastReminderAt?: Date;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Document, document => document.signatures)
  @JoinColumn({ name: 'document_id' })
  document: Document;

  // Virtual properties
  get isSigned(): boolean {
    return this.status === SignatureStatus.SIGNED && !!this.signedAt;
  }

  get isExpired(): boolean {
    return !!this.expiresAt && this.expiresAt < new Date();
  }

  get isPending(): boolean {
    return this.status === SignatureStatus.PENDING && !this.isExpired;
  }

  get canSign(): boolean {
    return this.isPending && !this.isExpired;
  }
}