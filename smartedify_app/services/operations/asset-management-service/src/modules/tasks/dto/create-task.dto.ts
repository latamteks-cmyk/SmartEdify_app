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
  IsNumber,
  Min,
  Length,
} from 'class-validator';
import { TaskType, TaskClassification } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Incident that generated this task',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  incident_id?: string;

  @ApiProperty({
    description: 'Asset related to this task',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  asset_id?: string;

  @ApiProperty({
    description: 'Space/area related to this task',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  space_id?: string;

  @ApiProperty({
    description: 'Maintenance plan that generated this task',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  plan_id?: string;

  @ApiProperty({
    description: 'Task title or summary',
    example: 'Mantenimiento preventivo ascensor Torre A',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 255)
  title: string;

  @ApiProperty({
    description: 'Detailed task description',
    example: 'Realizar inspección mensual del sistema de frenos y cables del ascensor principal',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 2000)
  description: string;

  @ApiProperty({
    description: 'Type of task',
    enum: TaskType,
    example: TaskType.TECHNICAL_MAINTENANCE,
  })
  @IsEnum(TaskType)
  @IsNotEmpty()
  type: TaskType;

  @ApiProperty({
    description: 'Task classification for prioritization',
    enum: TaskClassification,
    example: TaskClassification.ORDINARY,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskClassification)
  classification?: TaskClassification;

  @ApiProperty({
    description: 'Scheduled execution date and time (ISO 8601)',
    example: '2023-12-15T09:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduled_for?: string;

  @ApiProperty({
    description: 'Estimated duration in minutes',
    example: 120,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimated_duration_minutes?: number;

  @ApiProperty({
    description: 'Required skills or certifications',
    example: ['elevator_certified', 'electrical_safety'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  required_skills?: string[];

  @ApiProperty({
    description: 'Required tools and equipment',
    example: ['multimeter', 'safety_harness', 'elevator_key'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  required_tools?: string[];

  @ApiProperty({
    description: 'Required consumables and quantities',
    example: {
      'brake_oil': { quantity: 2, unit: 'liters' },
      'cleaning_cloth': { quantity: 5, unit: 'pieces' }
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  required_consumables?: Record<string, { quantity: number; unit: string }>;

  @ApiProperty({
    description: 'Task instructions and checklist',
    example: [
      'Verificar funcionamiento de frenos',
      'Inspeccionar cables por desgaste',
      'Limpiar cabina y mecanismos',
      'Probar sistema de emergencia'
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];

  @ApiProperty({
    description: 'Safety requirements and precautions',
    example: {
      risk_level: 'HIGH',
      required_ppe: ['safety_harness', 'helmet', 'gloves'],
      safety_checklist: ['lockout_tagout', 'area_secured', 'emergency_contact']
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  safety_requirements?: Record<string, any>;

  @ApiProperty({
    description: 'Additional task metadata',
    example: {
      priority_score: 85,
      complexity_level: 'medium',
      weather_dependent: false,
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}