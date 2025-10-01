import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsUUID,
  IsNumber,
  Min,
  Max,
  Length,
  ValidateIf,
} from 'class-validator';
import { UnitKind, CommonAreaType } from '../entities/unit.entity';

export class CreateUnitDto {
  @ApiProperty({
    description: 'Condominium ID that will contain this unit',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  condominium_id: string;

  @ApiProperty({
    description: 'Local code/identifier for the unit within the condominium',
    example: 'T-101',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  local_code: string;

  @ApiProperty({
    description: 'Type of unit',
    enum: UnitKind,
    example: UnitKind.PRIVATE,
  })
  @IsEnum(UnitKind)
  @IsNotEmpty()
  kind: UnitKind;

  @ApiProperty({
    description: 'Type of common area (required only for COMMON units)',
    enum: CommonAreaType,
    example: CommonAreaType.POOL,
    required: false,
  })
  @ValidateIf((o) => o.kind === UnitKind.COMMON)
  @IsEnum(CommonAreaType)
  @IsNotEmpty()
  common_type?: CommonAreaType;

  @ApiProperty({
    description: 'Building ID that contains this unit',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  building_id?: string;

  @ApiProperty({
    description: 'Aliquot percentage for this unit (0.0 to 1.0)',
    example: 0.025,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  aliquot?: number;

  @ApiProperty({
    description: 'Floor or level where the unit is located',
    example: '10',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  floor?: string;

  @ApiProperty({
    description: 'Area of the unit in square meters',
    example: 85.5,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  area_m2?: number;

  @ApiProperty({
    description: 'Additional metadata for the unit',
    example: {
      rooms: 3,
      bathrooms: 2,
      parking_spaces: 1,
      storage_room: true,
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;

  @ApiProperty({
    description: 'Cost center ID for accounting purposes',
    example: 'CC-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  cost_center_id?: string;

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
    required: false,
  })
  @IsOptional()
  @IsObject()
  revenue_cfg?: Record<string, any>;
}