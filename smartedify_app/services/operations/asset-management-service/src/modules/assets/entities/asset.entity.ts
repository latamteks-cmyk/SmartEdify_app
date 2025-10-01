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
import { Space } from '../../spaces/entities/space.entity';
import { MaintenancePlan } from '../../maintenance-plans/entities/maintenance-plan.entity';
import { WorkOrder } from '../../work-orders/entities/work-order.entity';

export enum AssetType {
  HARD = 'HARD', // Activos técnicos
  SOFT = 'SOFT', // Activos espaciales
}

export enum AssetCategory {
  // Hard Assets (Técnicos)
  ELEVATOR = 'elevator',
  PUMP = 'pump',
  GENERATOR = 'generator',
  HVAC = 'hvac',
  ELECTRICAL = 'electrical',
  PLUMBING = 'plumbing',
  FIRE_SAFETY = 'fire_safety',
  SECURITY = 'security',
  LIGHTING = 'lighting',
  COMMUNICATION = 'communication',
  
  // Soft Assets (Espaciales)
  GARDEN = 'garden',
  LOBBY = 'lobby',
  HALLWAY = 'hallway',
  PARKING = 'parking',
  POOL = 'pool',
  GYM = 'gym',
  PLAYGROUND = 'playground',
  ROOFTOP = 'rooftop',
  FACADE = 'facade',
  COMMON_AREA = 'common_area',
}

export enum AssetCriticality {
  A = 'A', // Crítico
  B = 'B', // Importante
  C = 'C', // Secundario
}

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  OUT_OF_ORDER = 'OUT_OF_ORDER',
  DECOMMISSIONED = 'DECOMMISSIONED',
}

@Entity('assets')
@Index(['tenant_id'])
@Index(['tenant_id', 'type'])
@Index(['tenant_id', 'category'])
@Index(['tenant_id', 'criticality'])
@Index(['tenant_id', 'status'])
@Index(['warranty_until'])
export class Asset {
  @ApiProperty({
    description: 'Unique identifier for the asset',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Tenant ID that owns this asset',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  tenant_id: string;

  @ApiProperty({
    description: 'Space/area where this asset is located',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: true })
  space_id: string;

  @ApiProperty({
    description: 'Asset name or identifier',
    example: 'Ascensor Principal Torre A',
  })
  @Column({ type: 'text', nullable: false })
  name: string;

  @ApiProperty({
    description: 'Type of asset',
    enum: AssetType,
    example: AssetType.HARD,
  })
  @Column({
    type: 'enum',
    enum: AssetType,
    nullable: false,
  })
  type: AssetType;

  @ApiProperty({
    description: 'Asset category',
    enum: AssetCategory,
    example: AssetCategory.ELEVATOR,
  })
  @Column({
    type: 'enum',
    enum: AssetCategory,
    nullable: false,
  })
  category: AssetCategory;

  @ApiProperty({
    description: 'Asset criticality level',
    enum: AssetCriticality,
    example: AssetCriticality.A,
  })
  @Column({
    type: 'enum',
    enum: AssetCriticality,
    default: AssetCriticality.B,
  })
  criticality: AssetCriticality;

  @ApiProperty({
    description: 'Current operational status',
    enum: AssetStatus,
    example: AssetStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.ACTIVE,
  })
  status: AssetStatus;

  @ApiProperty({
    description: 'Asset brand/manufacturer',
    example: 'Otis',
  })
  @Column({ type: 'text', nullable: true })
  brand: string;

  @ApiProperty({
    description: 'Asset model',
    example: 'Gen2 Premier',
  })
  @Column({ type: 'text', nullable: true })
  model: string;

  @ApiProperty({
    description: 'Serial number',
    example: 'OT2023001234',
  })
  @Column({ type: 'text', nullable: true })
  serial_number: string;

  @ApiProperty({
    description: 'Installation date',
    example: '2023-01-15',
  })
  @Column({ type: 'date', nullable: true })
  installation_date: Date;

  @ApiProperty({
    description: 'Warranty expiration date',
    example: '2025-01-15',
  })
  @Column({ type: 'date', nullable: true })
  warranty_until: Date;

  @ApiProperty({
    description: 'Operation manual document ID',
    example: 'doc_123456789',
  })
  @Column({ type: 'text', nullable: true })
  manual_operacion_id: string;

  @ApiProperty({
    description: 'Maintenance manual document ID',
    example: 'doc_987654321',
  })
  @Column({ type: 'text', nullable: true })
  manual_mantenimiento_id: string;

  @ApiProperty({
    description: 'Asset photos URLs',
    example: ['https://cdn.smartedify.com/assets/photo1.jpg'],
  })
  @Column({ type: 'jsonb', default: [] })
  fotos: string[];

  @ApiProperty({
    description: 'Additional metadata and custom attributes',
    example: {
      capacity: '8 persons',
      floors_served: 15,
      last_inspection: '2023-12-01',
    },
  })
  @Column({ type: 'jsonb', default: {} })
  metadatos: Record<string, any>;

  @ApiProperty({
    description: 'Asset creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Asset last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Space, (space) => space.assets)
  @JoinColumn({ name: 'space_id' })
  space: Space;

  @OneToMany(() => MaintenancePlan, (plan) => plan.asset)
  maintenance_plans: MaintenancePlan[];

  @OneToMany(() => WorkOrder, (workOrder) => workOrder.asset)
  work_orders: WorkOrder[];

  // Virtual properties
  get isUnderWarranty(): boolean {
    if (!this.warranty_until) return false;
    return new Date() <= this.warranty_until;
  }

  get isCritical(): boolean {
    return this.criticality === AssetCriticality.A;
  }

  get isOperational(): boolean {
    return this.status === AssetStatus.ACTIVE;
  }

  get requiresMaintenance(): boolean {
    return this.type === AssetType.HARD || 
           (this.type === AssetType.SOFT && this.category !== AssetCategory.COMMON_AREA);
  }

  get warrantyStatus(): 'active' | 'expired' | 'unknown' {
    if (!this.warranty_until) return 'unknown';
    return this.isUnderWarranty ? 'active' : 'expired';
  }
}