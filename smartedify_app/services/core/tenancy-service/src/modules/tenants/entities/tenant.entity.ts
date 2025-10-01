import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Condominium } from '../../condominiums/entities/condominium.entity';

export enum TenantType {
  ADMINISTRADORA = 'ADMINISTRADORA',
  JUNTA = 'JUNTA',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

@Entity('tenants')
@Index(['status'])
@Index(['country_code'])
export class Tenant {
  @ApiProperty({
    description: 'Unique identifier for the tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Type of tenant',
    enum: TenantType,
    example: TenantType.ADMINISTRADORA,
  })
  @Column({
    type: 'enum',
    enum: TenantType,
    nullable: false,
  })
  type: TenantType;

  @ApiProperty({
    description: 'Legal name of the tenant organization',
    example: 'Gestora Inmobiliaria XYZ S.A.C.',
  })
  @Column({ type: 'text', nullable: false })
  legal_name: string;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'PE',
  })
  @Column({ type: 'text', nullable: false })
  country_code: string;

  @ApiProperty({
    description: 'Current status of the tenant',
    enum: TenantStatus,
    example: TenantStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @ApiProperty({
    description: 'Additional metadata for the tenant',
    example: {
      tax_id: '20123456789',
      contact_email: 'admin@gestora.com',
      phone: '+51987654321',
    },
  })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'Tenant creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Tenant last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @OneToMany(() => Condominium, (condominium) => condominium.tenant)
  condominiums: Condominium[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === TenantStatus.ACTIVE;
  }

  get canManageMultipleCondominiums(): boolean {
    return this.type === TenantType.ADMINISTRADORA;
  }
}