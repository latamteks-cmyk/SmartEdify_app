import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Check,
} from 'typeorm';

@Entity('users')
@Unique(['tenant_id', 'username'])
@Unique(['tenant_id', 'email'])
@Check('CHK_users_status', `status IN ('ACTIVE', 'INACTIVE', 'LOCKED')`)
@Check(
  'CHK_users_preferred_login',
  `preferred_login IN ('PASSWORD', 'TOTP', 'WEBAUTHN')`,
)
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { comment: 'Reference to tenant in tenancy-service' })
  tenant_id: string;

  @Column({ comment: 'Unique username within tenant scope' })
  username: string;

  @Column({
    comment: 'Email address, used for authentication and verification',
  })
  email: string;

  @Column({
    nullable: true,
    comment: 'Phone number in E.164 format, used for OTP verification',
  })
  phone: string;

  @Column({
    nullable: true,
    comment: 'Argon2id hashed password, nullable for passwordless users',
  })
  password?: string;

  @Column({ nullable: true, comment: 'TOTP secret for MFA, encrypted at rest' })
  mfa_secret?: string;

  @Column({
    type: 'varchar',
    default: 'ACTIVE',
    comment: 'User account status',
  })
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Timestamp when email was verified',
  })
  email_verified_at: Date | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Timestamp when phone was verified',
  })
  phone_verified_at: Date | null;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Preferred authentication method for this user',
  })
  preferred_login: 'PASSWORD' | 'TOTP' | 'WEBAUTHN' | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Computed properties for convenience
  get isEmailVerified(): boolean {
    return this.email_verified_at !== null;
  }

  get isPhoneVerified(): boolean {
    return this.phone_verified_at !== null;
  }

  get isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  get hasPassword(): boolean {
    return this.password !== null && this.password !== undefined;
  }

  get hasMfaEnabled(): boolean {
    return this.mfa_secret !== null && this.mfa_secret !== undefined;
  }
}
