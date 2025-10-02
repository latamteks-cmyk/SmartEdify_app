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

export enum RoleType {
  ADMIN = 'ADMIN',
  PRESIDENT = 'PRESIDENT',
  SECRETARY = 'SECRETARY',
  TREASURER = 'TREASURER',
  COUNCIL_MEMBER = 'COUNCIL_MEMBER',
  MANAGER = 'MANAGER',
  SECURITY = 'SECURITY',
  MAINTENANCE = 'MAINTENANCE',
}

export enum RoleScope {
  TENANT = 'TENANT',
  CONDOMINIUM = 'CONDOMINIUM',
  BUILDING = 'BUILDING',
  UNIT = 'UNIT',
}

export enum RoleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('user_roles')
@Index(['tenantId', 'profileId'])
@Index(['tenantId', 'condominiumId'])
@Index(['roleType', 'scope'])
@Index(['status'], { where: 'status = \'ACTIVE\'' })
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId: string;

  @Column({ name: 'condominium_id', type: 'uuid', nullable: true })
  condominiumId?: string;

  @Column({ name: 'building_id', type: 'uuid', nullable: true })
  buildingId?: string;

  @Column({
    name: 'role_type',
    type: 'enum',
    enum: RoleType,
  })
  roleType: RoleType;

  @Column({
    type: 'enum',
    enum: RoleScope,
    default: RoleScope.CONDOMINIUM,
  })
  scope: RoleScope;

  @Column({ type: 'jsonb', default: [] })
  permissions: string[];

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: Date;

  @Column({
    type: 'enum',
    enum: RoleStatus,
    default: RoleStatus.ACTIVE,
  })
  status: RoleStatus;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserProfile, (profile) => profile.roles)
  @JoinColumn({ name: 'profile_id' })
  profile: UserProfile;
}