import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsUUID,
  IsDateString,
  IsArray,
  Length,
  IsUrl,
} from 'class-validator';
import { AssetType, AssetCategory, AssetCriticality, AssetStatus } from '../entities/asset.entity';

export class CreateAssetDto {
  @ApiProperty({
    description: 'Space/area where this asset is located',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  space_id?: string;

  @ApiProperty({
    description: 'Asset name or identifier',
    example: 'Ascensor Principal Torre A',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  name: string;

  @ApiProperty({
    description: 'Type of asset',
    enum: AssetType,
    example: AssetType.HARD,
  })
  @IsEnum(AssetType)
  @IsNotEmpty()
  type: AssetType;

  @ApiProperty({
    description: 'Asset category',
    enum: AssetCategory,
    example: AssetCategory.ELEVATOR,
  })
  @IsEnum(AssetCategory)
  @IsNotEmpty()
  category: AssetCategory;

  @ApiProperty({
    description: 'Asset criticality level',
    enum: AssetCriticality,
    example: AssetCriticality.A,
    required: false,
  })
  @IsOptional()
  @IsEnum(AssetCriticality)
  criticality?: AssetCriticality;

  @ApiProperty({
    description: 'Current operational status',
    enum: AssetStatus,
    example: AssetStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiProperty({
    description: 'Asset brand/manufacturer',
    example: 'Otis',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  brand?: string;

  @ApiProperty({
    description: 'Asset model',
    example: 'Gen2 Premier',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  model?: string;

  @ApiProperty({
    description: 'Serial number',
    example: 'OT2023001234',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  serial_number?: string;

  @ApiProperty({
    description: 'Installation date (ISO 8601 date)',
    example: '2023-01-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  installation_date?: string;

  @ApiProperty({
    description: 'Warranty expiration date (ISO 8601 date)',
    example: '2025-01-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  warranty_until?: string;

  @ApiProperty({
    description: 'Operation manual document ID',
    example: 'doc_123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  manual_operacion_id?: string;

  @ApiProperty({
    description: 'Maintenance manual document ID',
    example: 'doc_987654321',
    required: false,
  })
  @IsOptional()
  @IsString()
  manual_mantenimiento_id?: string;

  @ApiProperty({
    description: 'Asset photos URLs',
    example: ['https://cdn.smartedify.com/assets/photo1.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  fotos?: string[];

  @ApiProperty({
    description: 'Additional metadata and custom attributes',
    example: {
      capacity: '8 persons',
      floors_served: 15,
      last_inspection: '2023-12-01',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadatos?: Record<string, any>;
}