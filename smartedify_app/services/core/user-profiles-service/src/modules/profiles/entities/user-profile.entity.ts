import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { UserMembership } from './user-membership.entity';
import { UserRole } from './user-role.entity';
import { UserEntitlement } from './user-entitlement.entity';
import { ProfileStatusHistory } from './profile-status-history.entity';

export enum ProfileStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  INACTIVE = 'INACTIVE',
}

@Entity('user_profiles')
@Index(['tenantId', 'email'], { unique: true })
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column('uuid', { name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column()
  @Index()
  email: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'document_type', nullable: true })
  documentType?: string;

  @Column({ name: 'document_number', nullable: true })
  documentNumber?: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: Date;

  @Column({ nullable: true })
  gender?: string;

  @Column({ nullable: true })
  nationality?: string;

  @Column('jsonb', { nullable: true })
  address?: Record<string, any>;

  @Column('jsonb', { name: 'emergency_contact', nullable: true })
  emergencyContact?: Record<string, any>;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column('jsonb', { name: 'verification_data', nullable: true })
  verificationData?: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 50,
    default: ProfileStatus.PENDING_VERIFICATION,
  })
  status: ProfileStatus;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @Column('jsonb', { default: {} })
  preferences: Record<string, any>;

  @Column('timestamp', { name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserMembership, membership => membership.profile)
  memberships: UserMembership[];

  @OneToMany(() => UserRole, role => role.profile)
  roles: UserRole[];

  @OneToMany(() => UserEntitlement, entitlement => entitlement.profile)
  entitlements: UserEntitlement[];

  @OneToMany(() => ProfileStatusHistory, history => history.profile)
  statusHistory: ProfileStatusHistory[];

  // Virtual properties
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isActive(): boolean {
    return this.status === ProfileStatus.ACTIVE && !this.deletedAt;
  }

  get hasVotingRights(): boolean {
    return this.memberships?.some(membership => 
      membership.votingRights && membership.status === 'ACTIVE'
    ) || false;
  }
}