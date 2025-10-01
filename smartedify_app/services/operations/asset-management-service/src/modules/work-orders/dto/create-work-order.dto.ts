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
import { WorkOrderType, WorkOrderPriority, AssigneeType } from '../entities/work-order.entity';

export class CreateWorkOrderDto {
  @ApiProperty({
    description: 'Task that generated this work order',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @ApiProperty({
    description: 'Asset related to this work order',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  asset_id?: string;

  @ApiProperty({
    description: 'Space/area related to this work order',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  space_id?: string;

  @ApiProperty({
    description: 'Work order title',
    example: 'Mantenimiento preventivo ascensor Torre A',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 255)
  title: string;

  @ApiProperty({
    description: 'Detailed work description',
    example: 'Realizar inspección completa del sistema de frenos, cables y mecanismos del ascensor',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 2000)
  description: string;

  @ApiProperty({
    description: 'Type of work order',
    enum: WorkOrderType,
    example: WorkOrderType.PREVENTIVE,
  })
  @IsEnum(WorkOrderType)
  @IsNotEmpty()
  type: WorkOrderType;

  @ApiProperty({
    description: 'Priority level',
    enum: WorkOrderPriority,
    example: WorkOrderPriority.MEDIUM,
    required: false,
  })
  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @ApiProperty({
    description: 'Who/what is assigned to this work order',
    example: 'tech_123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  assigned_to?: string;

  @ApiProperty({
    description: 'Type of assignee',
    enum: AssigneeType,
    example: AssigneeType.INTERNAL_TECH,
    required: false,
  })
  @IsOptional()
  @IsEnum(AssigneeType)
  assignee_type?: AssigneeType;

  @ApiProperty({
    description: 'User who created the work order',
    example: 'admin_123456789',
  })
  @IsString()
  @IsNotEmpty()
  created_by: string;

  @ApiProperty({
    description: 'Scheduled start date and time (ISO 8601)',
    example: '2023-12-15T09:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduled_start?: string;

  @ApiProperty({
    description: 'Scheduled end date and time (ISO 8601)',
    example: '2023-12-15T12:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduled_end?: string;

  @ApiProperty({
    description: 'Due date for completion (ISO 8601)',
    example: '2023-12-15T18:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiProperty({
    description: 'Estimated duration in minutes',
    example: 180,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimated_duration_minutes?: number;

  @ApiProperty({
    description: 'Required skills and certifications',
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
    description: 'Work instructions and checklist',
    example: [
      'Verificar funcionamiento de frenos',
      'Inspeccionar cables por desgaste',
      'Limpiar cabina y mecanismos'
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];

  @ApiProperty({
    description: 'Safety requirements and high-risk checklist',
    example: {
      risk_level: 'HIGH',
      required_ppe: ['safety_harness', 'helmet'],
      safety_procedures: ['lockout_tagout', 'area_isolation'],
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  safety_requirements?: Record<string, any>;

  @ApiProperty({
    description: 'Additional work order metadata',
    example: {
      cost_estimate: 150.00,
      currency: 'USD',
      purchase_order_id: 'PO-2023-001',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}