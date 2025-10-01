import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsUUID,
  Length,
} from 'class-validator';
import { IncidentPriority, IncidentSource } from '../entities/incident.entity';

export class CreateIncidentDto {
  @ApiProperty({
    description: 'Asset related to this incident',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  asset_id?: string;

  @ApiProperty({
    description: 'Space/area where the incident occurred',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  space_id?: string;

  @ApiProperty({
    description: 'User who reported the incident',
    example: 'user_123456789',
  })
  @IsString()
  @IsNotEmpty()
  reported_by: string;

  @ApiProperty({
    description: 'Brief title or summary of the incident',
    example: 'Ascensor no funciona en Torre A',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 255)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the incident',
    example: 'El ascensor principal de la Torre A no responde al presionar los botones. Se escucha un ruido extraño.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 2000)
  description: string;

  @ApiProperty({
    description: 'Priority level of the incident',
    enum: IncidentPriority,
    example: IncidentPriority.HIGH,
    required: false,
  })
  @IsOptional()
  @IsEnum(IncidentPriority)
  priority?: IncidentPriority;

  @ApiProperty({
    description: 'Source of the incident report',
    enum: IncidentSource,
    example: IncidentSource.RESIDENT_APP,
  })
  @IsEnum(IncidentSource)
  @IsNotEmpty()
  source: IncidentSource;

  @ApiProperty({
    description: 'Location details where the incident occurred',
    example: {
      floor: '5',
      unit: 'A-501',
      specific_location: 'Frente al ascensor',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  location_details?: Record<string, any>;

  @ApiProperty({
    description: 'Additional metadata',
    example: {
      weather_conditions: 'normal',
      time_of_day: 'morning',
      affected_users: 15,
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}