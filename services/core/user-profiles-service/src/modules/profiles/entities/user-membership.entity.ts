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

export enum MembershipType {
  OWNER = 'OWNER',
  TENANT = 'TENANT',
  RESIDENT = 'RESIDENT',
  ADMINISTRATOR = 'ADMINISTRATOR',
  EMPLOYEE = 'EMPLOYEE',
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

@Entity('user_memberships')
@Index(['tenantId', 'profileId'])
@Index(['tenantId', 'condominiumId'])
@Index(['tenantId', 'unitId'])
@Index(['membershipType', 'status'])
@Index(['votingRights'], { where: 'voting_rights = true' })
export class UserMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId: string;

  @Column({ name: 'condominium_id', type: 'uuid' })
  condominiumId: string;

  @Column({ name: 'building_id', type: 'uuid', nullable: true })
  buildingId?: string;

  @Column({ name: 'unit_id', type: 'uuid', nullable: true })
  unitId?: string;

  @Column({
    name: 'membership_type',
    type: 'enum',
    enum: MembershipType,
  })
  membershipType: MembershipType;

  @Column({
    name: 'ownership_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0.00,
  })
  ownershipPercentage: number;

  @Column({ name: 'voting_rights', type: 'boolean', default: false })
  votingRights: boolean;

  @Column({ name: 'financial_obligations', type: 'boolean', default: false })
  financialObligations: boolean;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: Date;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.ACTIVE,
  })
  status: MembershipStatus;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserProfile, (profile) => profile.memberships)
  @JoinColumn({ name: 'profile_id' })
  profile: UserProfile;
}