import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumns,
} from 'typeorm';
import { Amenity } from './amenity.entity';

@Entity('waitlist_items')
export class WaitlistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'amenity_id' })
  amenityId: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column('tstzrange', { name: 'desired_time' })
  desiredTime: string;

  @Column({ default: 0 })
  priority: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Amenity, { onDelete: 'CASCADE' })
  @JoinColumns([
    { name: 'amenity_id', referencedColumnName: 'id' },
    { name: 'tenant_id', referencedColumnName: 'tenantId' },
  ])
  amenity: Amenity;
}