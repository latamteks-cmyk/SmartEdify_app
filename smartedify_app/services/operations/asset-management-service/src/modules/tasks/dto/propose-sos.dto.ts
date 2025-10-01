import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  IsDateString,
  Length,
} from 'class-validator';

export class ProposeSosDto {
  @ApiProperty({
    description: 'Title for the SOS proposal',
    example: 'Mantenimiento Integral Torre A - Diciembre 2023',
    minLength: 10,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 255)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the work to be performed',
    example: 'Mantenimiento preventivo integral de ascensor, limpieza de áreas comunes y revisión de sistemas eléctricos',
    minLength: 20,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @Length(20, 2000)
  description: string;

  @ApiProperty({
    description: 'Preferred execution date',
    example: '2023-12-15T09:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  preferred_date?: string;

  @ApiProperty({
    description: 'Response deadline for providers',
    example: '2023-12-10T18:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  response_deadline?: string;

  @ApiProperty({
    description: 'Required provider qualifications',
    example: ['elevator_certified', 'electrical_license', 'insurance_coverage'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  required_qualifications?: string[];

  @ApiProperty({
    description: 'Specific requirements and constraints',
    example: {
      working_hours: '08:00-17:00',
      noise_restrictions: true,
      resident_notification_required: true,
      estimated_duration_hours: 8,
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  requirements?: Record<string, any>;

  @ApiProperty({
    description: 'Additional attachments or documents',
    example: ['technical_specs.pdf', 'area_photos.zip'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiProperty({
    description: 'Special instructions for providers',
    example: 'Coordinate with building administration 24h in advance. Use service elevator only.',
    required: false,
  })
  @IsOptional()
  @IsString()
  special_instructions?: string;

  @ApiProperty({
    description: 'Budget range or constraints',
    example: {
      min_budget: 1000,
      max_budget: 5000,
      currency: 'USD',
      payment_terms: '30 days',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  budget_info?: Record<string, any>;
}