import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Length,
} from 'class-validator';

export class ApproveWorkOrderDto {
  @ApiProperty({
    description: 'Supervisor who is approving the work order',
    example: 'supervisor_123456789',
  })
  @IsString()
  @IsNotEmpty()
  approved_by: string;

  @ApiProperty({
    description: 'Quality score assigned by supervisor (1-10)',
    example: 9,
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  quality_score: number;

  @ApiProperty({
    description: 'Approval notes and feedback',
    example: 'Trabajo completado satisfactoriamente. Excelente atención al detalle.',
    minLength: 5,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 1000)
  approval_notes: string;

  @ApiProperty({
    description: 'Additional feedback for the technician',
    example: 'Continuar con el mismo nivel de calidad en futuros trabajos.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  technician_feedback?: string;

  @ApiProperty({
    description: 'Follow-up actions required',
    example: 'Programar lubricación adicional en 30 días',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  follow_up_actions?: string;
}