import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  Length,
} from 'class-validator';
import { SpaceCategory, SpaceComplexity } from '../entities/space.entity';

export class CreateSpaceDto {
  @ApiProperty({
    description: 'Space name or identifier',
    example: 'Lobby Principal Torre A',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  name: string;

  @ApiProperty({
    description: 'Space category',
    enum: SpaceCategory,
    example: SpaceCategory.LOBBY,
  })
  @IsEnum(SpaceCategory)
  @IsNotEmpty()
  category: SpaceCategory;

  @ApiProperty({
    description: 'Usable floor area in square meters',
    example: 150.5,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  usable_floor_area_m2?: number;

  @ApiProperty({
    description: 'Perimeter in meters',
    example: 48.0,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  perimeter_m?: number;

  @ApiProperty({
    description: 'Wall height in meters',
    example: 3.2,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  wall_height_m?: number;

  @ApiProperty({
    description: 'Space complexity level for maintenance calculations',
    enum: SpaceComplexity,
    example: SpaceComplexity.M,
    required: false,
  })
  @IsOptional()
  @IsEnum(SpaceComplexity)
  complexity?: SpaceComplexity;

  @ApiProperty({
    description: 'Additional space metadata',
    example: {
      ceiling_type: 'suspended',
      lighting_type: 'LED',
      flooring_material: 'marble',
      special_features: ['fountain', 'reception_desk'],
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}