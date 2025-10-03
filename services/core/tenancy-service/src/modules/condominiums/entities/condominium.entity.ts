import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Building } from '../../buildings/entities/building.entity';
import { Unit } from '../../units/entities/unit.entity';

export enum CondominiumStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('condominiums')
@Index(['tenant_id'])
@Index(['tenant_id', 'status'])
@Index(['country_code'])
export class Condominium {
  @ApiProperty({
    description: 'Unique identifier for the condominium',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Tenant ID that owns this condominium',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  tenant_id: string;

  @ApiProperty({
    description: 'Name of the condominium',
    example: 'Residencial Las Flores',
  })
  @Column({ type: 'text', nullable: false })
  name: string;

  @ApiProperty({
    description: 'Physical address of the condominium',
    example: 'Av. Javier Prado Este 123, San Isidro, Lima',
  })
  @Column({ type: 'text', nullable: true })
  address: string;

  @ApiProperty({
    description: 'Country code where the condominium is located',
    example: 'PE',
  })
  @Column({ type: 'text', nullable: true })
  country_code: string;

  @ApiProperty({
    description: 'Current status of the condominium',
    enum: CondominiumStatus,
    example: CondominiumStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: CondominiumStatus,
    default: CondominiumStatus.ACTIVE,
  })
  status: CondominiumStatus;

  @ApiProperty({
    description: 'Financial configuration and rules for the condominium',
    example: {
      currency: 'PEN',
      aliquot_calculation: 'by_area',
      late_payment_interest: 0.02,
      grace_period_days: 5,
      tax_retention_rate: 0.08,
    },
  })
  @Column({ type: 'jsonb', default: {} })
  financial_profile: Record<string, any>;

  @ApiProperty({
    description: 'Additional metadata for the condominium',
    example: {
      total_units: 120,
      common_areas: ['pool', 'gym', 'coworking'],
      construction_year: 2020,
    },
  })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'Condominium creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Condominium last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.condominiums)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => Building, (building) => building.condominium)
  buildings: Building[];

  @OneToMany(() => Unit, (unit) => unit.condominium)
  units: Unit[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === CondominiumStatus.ACTIVE;
  }

  get currency(): string {
    return this.financial_profile?.currency || 'USD';
  }

  get hasMultipleBuildings(): boolean {
    return this.buildings && this.buildings.length > 1;
  }
}