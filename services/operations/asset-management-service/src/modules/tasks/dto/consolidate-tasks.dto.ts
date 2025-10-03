import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMinSize,
  Length,
} from 'class-validator';

export class ConsolidateTasksDto {
  @ApiProperty({
    description: 'Array of task IDs to consolidate',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001'
    ],
    minItems: 2,
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'At least 2 tasks are required for consolidation' })
  @IsUUID(4, { each: true })
  task_ids: string[];

  @ApiProperty({
    description: 'Name for the consolidated task group',
    example: 'Mantenimiento Torre A - Semana 50',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 255)
  group_name: string;

  @ApiProperty({
    description: 'Description for the consolidated group',
    example: 'Consolidación de tareas de mantenimiento para Torre A programadas para la semana 50',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(10, 1000)
  group_description?: string;

  @ApiProperty({
    description: 'Consolidation reason',
    example: 'Same area and compatible time window',
    required: false,
  })
  @IsOptional()
  @IsString()
  consolidation_reason?: string;

  @ApiProperty({
    description: 'Additional notes for the consolidation',
    example: 'All tasks can be performed by the same technician in a single visit',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}