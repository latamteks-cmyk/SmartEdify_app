import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';

export enum GrantedBy {
  ROLE = 'ROLE',
  MEMBERSHIP = 'MEMBERSHIP',
  DIRECT = 'DIRECT',
  INHERITED = 'INHERITED',
}

export enum EntitlementStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REVOKED = 'REVOKED',
}

@Entity('user_entitlements')
@Index(['tenantId', 'profileId'])
@Index(['resourceType', 'resourceId', 'action'])
@Index(['grantedBy', 'grantedFrom'])
@Index(['status'], { where: 'status = \'ACTIVE\'' })
@Index(['startDate', 'endDate'])
export class UserEntitlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 50 })
  resourceType: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId?: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({
    name: 'granted_by',
    type: 'enum',
    enum: GrantedBy,
  })
  grantedBy: GrantedBy;

  @Column({ name: 'granted_from', type: 'uuid', nullable: true })
  grantedFrom?: string;

  @Column({ type: 'jsonb', nullable: true })
  conditions?: Record<string, any>;

  @Column({ name: 'start_date', type: 'timestamptz', default: () => 'NOW()' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  endDate?: Date;

  @Column({
    type: 'enum',
    enum: EntitlementStatus,
    default: EntitlementStatus.ACTIVE,
  })
  status: EntitlementStatus;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserProfile, (profile) => profile.entitlements)
  @JoinColumn({ name: 'profile_id' })
  profile: UserProfile;
}