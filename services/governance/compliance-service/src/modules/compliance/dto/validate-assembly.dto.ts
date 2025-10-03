import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AssemblyType {
  ORDINARY = 'ORDINARY',
  EXTRAORDINARY = 'EXTRAORDINARY',
  EMERGENCY = 'EMERGENCY',
}

export class ValidateAssemblyDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({
    description: 'Assembly ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  assemblyId: string;

  @ApiProperty({
    description: 'Country code',
    example: 'PE',
  })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({
    description: 'Assembly type',
    enum: AssemblyType,
    example: AssemblyType.ORDINARY,
  })
  @IsEnum(AssemblyType)
  assemblyType: AssemblyType;

  @ApiProperty({
    description: 'Scheduled date for the assembly',
    example: '2025-02-15T10:00:00Z',
  })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({
    description: 'Notice date when convocation was sent',
    example: '2025-01-01T10:00:00Z',
  })
  @IsDateString()
  noticeDate: string;

  @ApiPropertyOptional({
    description: 'Assembly modality',
    example: 'MIXTA',
  })
  @IsOptional()
  @IsString()
  modality?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { topics: ['budget', 'maintenance'] },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}