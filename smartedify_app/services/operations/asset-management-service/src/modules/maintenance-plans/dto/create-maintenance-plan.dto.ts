import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsUUID,
  IsArray,
  IsNumber,
  Min,
  Length,
  ValidateIf,
} from 'class-validator';
import { MaintenanceType, TriggerType, FrequencyUnit } from '../entities/maintenance-plan.entity';

export class CreateMaintenancePlanDto {
  @ApiProperty({
    description: 'Asset this plan applies to (for hard assets)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  asset_id?: string;

  @ApiProperty({
    description: 'Space this plan applies to (for soft assets)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  space_id?: string;

  @ApiProperty({
    description: 'Plan name or title',
    example: 'Mantenimiento Mensual Ascensor Torre A',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 255)
  name: string;

  @ApiProperty({
    description: 'Detailed plan description',
    example: 'Plan de mantenimiento preventivo mensual para el ascensor principal de la Torre A',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiProperty({
    description: 'Type of maintenance',
    enum: MaintenanceType,
    example: MaintenanceType.PREVENTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(MaintenanceType)
  maintenance_type?: MaintenanceType;

  @ApiProperty({
    description: 'What triggers this maintenance plan',
    enum: TriggerType,
    example: TriggerType.TIME_BASED,
  })
  @IsEnum(TriggerType)
  @IsNotEmpty()
  trigger_type: TriggerType;

  @ApiProperty({
    description: 'Frequency value (e.g., 1 for every 1 month)',
    example: 1,
    minimum: 1,
    required: false,
  })
  @ValidateIf((o) => o.trigger_type === TriggerType.TIME_BASED)
  @IsNumber()
  @Min(1)
  frequency_value?: number;

  @ApiProperty({
    description: 'Frequency unit',
    enum: FrequencyUnit,
    example: FrequencyUnit.MONTHS,
    required: false,
  })
  @ValidateIf((o) => o.trigger_type === TriggerType.TIME_BASED)
  @IsEnum(FrequencyUnit)
  frequency_unit?: FrequencyUnit;

  @ApiProperty({
    description: 'Usage threshold for usage-based triggers (e.g., hours)',
    example: 1000,
    minimum: 1,
    required: false,
  })
  @ValidateIf((o) => o.trigger_type === TriggerType.USAGE_BASED)
  @IsNumber()
  @Min(1)
  usage_threshold?: number;

  @ApiProperty({
    description: 'Condition thresholds for condition-based triggers',
    example: {
      temperature_max: 80,
      vibration_max: 5.0,
      pressure_min: 2.5,
    },
    required: false,
  })
  @ValidateIf((o) => o.trigger_type === TriggerType.CONDITION_BASED)
  @IsObject()
  condition_thresholds?: Record<string, number>;

  @ApiProperty({
    description: 'Estimated duration for plan execution in minutes',
    example: 180,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimated_duration_minutes?: number;

  @ApiProperty({
    description: 'Required skills for executing this plan',
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
    description: 'Standard consumables needed',
    example: {
      'brake_oil': { quantity: 2, unit: 'liters' },
      'cleaning_supplies': { quantity: 1, unit: 'kit' }
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  standard_consumables?: Record<string, { quantity: number; unit: string }>;

  @ApiProperty({
    description: 'Maintenance checklist and procedures',
    example: [
      'Verificar funcionamiento de frenos',
      'Inspeccionar cables por desgaste',
      'Limpiar cabina y mecanismos',
      'Probar sistema de emergencia',
      'Documentar lecturas de sensores'
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklist?: string[];

  @ApiProperty({
    description: 'Safety requirements and procedures',
    example: {
      risk_level: 'HIGH',
      required_ppe: ['safety_harness', 'helmet', 'gloves'],
      safety_procedures: ['lockout_tagout', 'area_isolation'],
      emergency_contacts: ['supervisor', 'safety_officer']
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  safety_requirements?: Record<string, any>;

  @ApiProperty({
    description: 'Plan configuration and settings',
    example: {
      auto_generate_tasks: true,
      require_admin_approval: true,
      send_reminders: true,
      reminder_days_before: 7,
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiProperty({
    description: 'Additional plan metadata',
    example: {
      created_by: 'admin_user_123',
      cost_center: 'MAINT_001',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}