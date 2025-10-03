import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

export enum BlackoutSource {
  MAINTENANCE = 'MAINTENANCE',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

@Entity('blackouts')
@Index(['tenantId', 'amenityId'])
@Index(['tenantId', 'condominiumId'])
export class Blackout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'amenity_id', nullable: true })
  amenityId?: string;

  @Column('uuid', { name: 'condominium_id' })
  condominiumId: string;

  @Column('tstzrange')
  time: string;

  @Column({ nullable: true })
  reason?: string;

  @Column({
    type: 'enum',
    enum: BlackoutSource,
  })
  source: BlackoutSource;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;
}