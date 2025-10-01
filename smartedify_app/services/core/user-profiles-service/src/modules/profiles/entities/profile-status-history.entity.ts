import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserProfile, ProfileStatus } from './user-profile.entity';

@Entity('profile_status_history')
@Index(['profileId', 'createdAt'])
export class ProfileStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column('uuid', { name: 'profile_id' })
  profileId: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'from_status',
  })
  fromStatus: ProfileStatus;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'to_status',
  })
  toStatus: ProfileStatus;

  @Column({ nullable: true })
  reason?: string;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'changed_by', nullable: true })
  changedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'profile_id' })
  profile: UserProfile;
}