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
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Condominium } from '../../condominiums/entities/condominium.entity';
import { Unit } from '../../units/entities/unit.entity';

@Entity('buildings')
@Index(['tenant_id'])
@Index(['tenant_id', 'condominium_id'])
@Unique(['tenant_id', 'condominium_id', 'name'])
export class Building {
  @ApiProperty({
    description: 'Unique identifier for the building',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Tenant ID that owns this building',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  tenant_id: string;

  @ApiProperty({
    description: 'Condominium ID that contains this building',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  condominium_id: string;

  @ApiProperty({
    description: 'Name or identifier of the building',
    example: 'Torre A',
  })
  @Column({ type: 'text', nullable: false })
  name: string;

  @ApiProperty({
    description: 'Number of levels/floors in the building',
    example: 15,
  })
  @Column({ type: 'integer', nullable: true })
  levels: number;

  @ApiProperty({
    description: 'Additional metadata for the building',
    example: {
      construction_year: 2020,
      elevator_count: 2,
      parking_levels: 3,
      total_area_m2: 5000,
      architect: 'Estudio Arquitectónico XYZ',
    },
  })
  @Column({ type: 'jsonb', default: {} })
  meta: Record<string, any>;

  @ApiProperty({
    description: 'Building creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Building last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Condominium, (condominium) => condominium.buildings)
  @JoinColumn({ name: 'condominium_id' })
  condominium: Condominium;

  @OneToMany(() => Unit, (unit) => unit.building)
  units: Unit[];

  // Virtual properties
  get hasElevator(): boolean {
    return this.meta?.elevator_count > 0;
  }

  get totalUnits(): number {
    return this.units?.length || 0;
  }

  get constructionYear(): number | null {
    return this.meta?.construction_year || null;
  }
}