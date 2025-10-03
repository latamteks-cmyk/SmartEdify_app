import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  Check,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Condominium } from '../../condominiums/entities/condominium.entity';
import { Building } from '../../buildings/entities/building.entity';

export enum UnitKind {
  PRIVATE = 'PRIVATE',
  COMMON = 'COMMON',
}

export enum UnitStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum CommonAreaType {
  POOL = 'pool',
  GYM = 'gym',
  COWORKING = 'coworking',
  MEETING_ROOM = 'meeting_room',
  PARTY_ROOM = 'party_room',
  PLAYGROUND = 'playground',
  GARDEN = 'garden',
  PARKING = 'parking',
  STORAGE = 'storage',
  LAUNDRY = 'laundry',
  ROOFTOP = 'rooftop',
  LOBBY = 'lobby',
  HALLWAY = 'hallway',
  ELEVATOR = 'elevator',
  STAIRWAY = 'stairway',
  OTHER = 'other',
}

@Entity('units')
@Index(['tenant_id'])
@Index(['tenant_id', 'condominium_id'])
@Index(['tenant_id', 'condominium_id', 'kind'])
@Index(['tenant_id', 'condominium_id', 'status'])
@Unique(['tenant_id', 'condominium_id', 'local_code'])
@Check(`"kind" IN ('PRIVATE', 'COMMON')`)
@Check(`"status" IN ('ACTIVE', 'INACTIVE')`)
@Check(`"aliquot" >= 0 AND "aliquot" <= 1`)
@Check(`"area_m2" IS NULL OR "area_m2" > 0`)
export class Unit {
  @ApiProperty({
    description: 'Unique identifier for the unit',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Tenant ID that owns this unit',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  tenant_id: string;

  @ApiProperty({
    description: 'Condominium ID that contains this unit',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  condominium_id: string;

  @ApiProperty({
    description: 'Local code/identifier for the unit within the condominium',
    example: 'T-101',
  })
  @Column({ type: 'text', nullable: false })
  local_code: string;

  @ApiProperty({
    description: 'Type of unit',
    enum: UnitKind,
    example: UnitKind.PRIVATE,
  })
  @Column({
    type: 'enum',
    enum: UnitKind,
    nullable: false,
  })
  kind: UnitKind;

  @ApiProperty({
    description: 'Type of common area (only for COMMON units)',
    enum: CommonAreaType,
    example: CommonAreaType.POOL,
    required: false,
  })
  @Column({
    type: 'enum',
    enum: CommonAreaType,
    nullable: true,
  })
  common_type: CommonAreaType;

  @ApiProperty({
    description: 'Building ID that contains this unit',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  building_id: string;

  @ApiProperty({
    description: 'Aliquot percentage for this unit (0.0 to 1.0)',
    example: 0.025,
  })
  @Column({ type: 'decimal', precision: 7, scale: 4, default: 0 })
  aliquot: number;

  @ApiProperty({
    description: 'Floor or level where the unit is located',
    example: '10',
  })
  @Column({ type: 'text', nullable: true })
  floor: string;

  @ApiProperty({
    description: 'Area of the unit in square meters',
    example: 85.5,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  area_m2: number;

  @ApiProperty({
    description: 'Additional metadata for the unit',
    example: {
      rooms: 3,
      bathrooms: 2,
      parking_spaces: 1,
      storage_room: true,
    },
  })
  @Column({ type: 'jsonb', default: {} })
  meta: Record<string, any>;

  @ApiProperty({
    description: 'Cost center ID for accounting purposes',
    example: 'CC-001',
  })
  @Column({ type: 'text', nullable: true })
  cost_center_id: string;

  @ApiProperty({
    description: 'Revenue configuration for common areas',
    example: {
      reservation: {
        hour_price: 20,
        currency: 'PEN',
        min_block: 60,
      },
      penalties: {
        no_show: 15,
        late_cancel_pct: 50,
      },
      exemptions: {
        board_members: true,
      },
    },
  })
  @Column({ type: 'jsonb', default: {} })
  revenue_cfg: Record<string, any>;

  @ApiProperty({
    description: 'Current status of the unit',
    enum: UnitStatus,
    example: UnitStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: UnitStatus,
    default: UnitStatus.ACTIVE,
  })
  status: UnitStatus;

  @ApiProperty({
    description: 'Unit creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Unit last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Condominium, (condominium) => condominium.units)
  @JoinColumn({ name: 'condominium_id' })
  condominium: Condominium;

  @ManyToOne(() => Building, (building) => building.units)
  @JoinColumn({ name: 'building_id' })
  building: Building;

  // Virtual properties
  get isActive(): boolean {
    return this.status === UnitStatus.ACTIVE;
  }

  get isPrivate(): boolean {
    return this.kind === UnitKind.PRIVATE;
  }

  get isCommon(): boolean {
    return this.kind === UnitKind.COMMON;
  }

  get hasReservationConfig(): boolean {
    return this.isCommon && !!this.revenue_cfg?.reservation;
  }

  get hourlyRate(): number | null {
    return this.revenue_cfg?.reservation?.hour_price || null;
  }

  get currency(): string {
    return this.revenue_cfg?.reservation?.currency || 'USD';
  }

  get roomCount(): number | null {
    return this.meta?.rooms || null;
  }

  get bathroomCount(): number | null {
    return this.meta?.bathrooms || null;
  }

  get parkingSpaces(): number {
    return this.meta?.parking_spaces || 0;
  }
}