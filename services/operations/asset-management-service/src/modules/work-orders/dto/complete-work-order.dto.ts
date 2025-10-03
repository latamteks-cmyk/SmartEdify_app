import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsArray,
  IsNumber,
  Min,
  Max,
  Length,
} from 'class-validator';

export class CompleteWorkOrderDto {
  @ApiProperty({
    description: 'Summary of work performed',
    example: 'Mantenimiento completado según checklist. Todos los sistemas funcionando correctamente.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 2000)
  work_performed: string;

  @ApiProperty({
    description: 'Issues found during execution',
    example: ['Desgaste menor en cable secundario', 'Ruido en motor requiere lubricación'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  issues_found?: string[];

  @ApiProperty({
    description: 'Recommendations for future maintenance',
    example: ['Reemplazar cable en próximo mantenimiento', 'Programar lubricación mensual'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendations?: string[];

  @ApiProperty({
    description: 'Quality self-assessment rating (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  quality_rating?: number;

  @ApiProperty({
    description: 'Consumables used during execution',
    example: {
      'brake_oil': { planned: 2, used: 1.5, unit: 'liters' },
      'cleaning_cloth': { planned: 5, used: 3, unit: 'pieces' }
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  consumables_used?: Record<string, { planned: number; used: number; unit: string }>;

  @ApiProperty({
    description: 'Additional completion notes',
    example: 'Trabajo realizado sin incidentes. Residente informado de las recomendaciones.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  completion_notes?: string;

  @ApiProperty({
    description: 'Time spent on different activities',
    example: {
      inspection: 30,
      repair: 90,
      testing: 20,
      cleanup: 10,
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  time_breakdown?: Record<string, number>;

  @ApiProperty({
    description: 'Safety incidents or near misses',
    example: [],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  safety_incidents?: string[];
}