import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TaskType, TaskClassification } from '../entities/incident.entity';

export class ClassifyIncidentDto {
  @ApiProperty({
    description: 'Asset to associate with this incident',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  asset_id?: string;

  @ApiProperty({
    description: 'Space to associate with this incident',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  space_id?: string;

  @ApiProperty({
    description: 'Type of task to generate from this incident',
    enum: TaskType,
    example: TaskType.TECHNICAL_MAINTENANCE,
  })
  @IsEnum(TaskType)
  @IsNotEmpty()
  task_type: TaskType;

  @ApiProperty({
    description: 'Classification of the task urgency',
    enum: TaskClassification,
    example: TaskClassification.URGENT,
  })
  @IsEnum(TaskClassification)
  @IsNotEmpty()
  task_classification: TaskClassification;

  @ApiProperty({
    description: 'Standardized description (can override LLM suggestion)',
    example: 'Elevator malfunction - Control panel unresponsive with abnormal noise',
    required: false,
  })
  @IsOptional()
  @IsString()
  standardized_description?: string;

  @ApiProperty({
    description: 'Classification notes',
    example: 'Classified as urgent due to safety concerns and multiple affected users',
    required: false,
  })
  @IsOptional()
  @IsString()
  classification_notes?: string;
}