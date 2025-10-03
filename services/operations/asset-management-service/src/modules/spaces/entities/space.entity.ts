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
import { Asset } from '../../assets/entities/asset.entity';
import { WorkOrder } from '../../work-orders/entities/work-order.entity';

export enum SpaceCategory {
  PETROOM = 'petroom',
  PASILLO = 'pasillo',
  LOBBY = 'lobby',
  PARKING = 'parking',
  POOL = 'pool',
  GYM = 'gym',
  PLAYGROUND = 'playground',
  GARDEN = 'garden',
  ROOFTOP = 'rooftop',
  HALLWAY = 'hallway',
  ELEVATOR_HALL = 'elevator_hall',
  STAIRWAY = 'stairway',
  LAUNDRY = 'laundry',
  STORAGE = 'storage',
  MEETING_ROOM = 'meeting_room',
  COWORKING = 'coworking',
  PARTY_ROOM = 'party_room',
  FACADE = 'facade',
  ENTRANCE = 'entrance',
  COMMON_BATHROOM = 'common_bathroom',
}

export enum SpaceComplexity {
  L = 'L', // Low - Espacios simples
  M = 'M', // Medium - Espacios estándar
  H = 'H', // High - Espacios complejos
}

@Entity('spaces')
@Index(['tenant_id'])
@Index(['tenant_id', 'category'])
@Index(['tenant_id', 'complexity'])
export class Space {
  @ApiProperty({
    description: 'Unique identifier for the space',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Tenant ID that owns this space',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', nullable: false })
  tenant_id: string;

  @ApiProperty({
    description: 'Space name or identifier',
    example: 'Lobby Principal Torre A',
  })
  @Column({ type: 'text', nullable: false })
  name: string;

  @ApiProperty({
    description: 'Space category',
    enum: SpaceCategory,
    example: SpaceCategory.LOBBY,
  })
  @Column({
    type: 'enum',
    enum: SpaceCategory,
    nullable: false,
  })
  category: SpaceCategory;

  @ApiProperty({
    description: 'Usable floor area in square meters',
    example: 150.5,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  usable_floor_area_m2: number;

  @ApiProperty({
    description: 'Perimeter in meters',
    example: 48.0,
  })
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  perimeter_m: number;

  @ApiProperty({
    description: 'Wall height in meters',
    example: 3.2,
  })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  wall_height_m: number;

  @ApiProperty({
    description: 'Wall area in square meters (calculated)',
    example: 153.6,
  })
  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2, 
    nullable: true,
    generatedType: 'STORED',
    asExpression: 'perimeter_m * wall_height_m'
  })
  wall_area_m2: number;

  @ApiProperty({
    description: 'Space complexity level for maintenance calculations',
    enum: SpaceComplexity,
    example: SpaceComplexity.M,
  })
  @Column({
    type: 'enum',
    enum: SpaceComplexity,
    default: SpaceComplexity.M,
  })
  complexity: SpaceComplexity;

  @ApiProperty({
    description: 'Additional space metadata',
    example: {
      ceiling_type: 'suspended',
      lighting_type: 'LED',
      flooring_material: 'marble',
      special_features: ['fountain', 'reception_desk'],
    },
  })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'Space creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({
    description: 'Space last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @OneToMany(() => Asset, (asset) => asset.space)
  assets: Asset[];

  @OneToMany(() => WorkOrder, (workOrder) => workOrder.space)
  work_orders: WorkOrder[];

  // Virtual properties
  get totalArea(): number {
    return (this.usable_floor_area_m2 || 0) + (this.wall_area_m2 || 0);
  }

  get isHighComplexity(): boolean {
    return this.complexity === SpaceComplexity.H;
  }

  get complexityMultiplier(): number {
    switch (this.complexity) {
      case SpaceComplexity.L:
        return 0.8;
      case SpaceComplexity.M:
        return 1.0;
      case SpaceComplexity.H:
        return 1.5;
      default:
        return 1.0;
    }
  }

  get estimatedCleaningTimeMinutes(): number {
    // Base calculation: 2 minutes per m2 for floor + 1 minute per m2 for walls
    const floorTime = (this.usable_floor_area_m2 || 0) * 2;
    const wallTime = (this.wall_area_m2 || 0) * 1;
    const baseTime = floorTime + wallTime;
    
    return Math.round(baseTime * this.complexityMultiplier);
  }

  get requiresSpecialEquipment(): boolean {
    return this.complexity === SpaceComplexity.H || 
           this.category === SpaceCategory.POOL ||
           this.category === SpaceCategory.GYM;
  }
}