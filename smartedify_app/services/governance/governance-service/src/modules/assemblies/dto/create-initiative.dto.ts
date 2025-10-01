import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AgendaItemDto {
  @ApiProperty({
    description: 'Agenda item title',
    example: 'Aprobación del presupuesto 2025',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Agenda item description',
    example: 'Revisión y aprobación del presupuesto anual para el ejercicio 2025',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Item type',
    example: 'VOTING',
    enum: ['INFORMATIVE', 'VOTING'],
  })
  @IsString()
  @IsNotEmpty()
  type: 'INFORMATIVE' | 'VOTING';

  @ApiProperty({
    description: 'Order in the agenda',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  order: number;
}

export class CreateInitiativeDto {
  @ApiProperty({
    description: 'Assembly ID for this initiative',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  assemblyId: string;

  @ApiProperty({
    description: 'Policy ID from compliance service',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  policyId: string;

  @ApiProperty({
    description: 'Policy version from compliance service',
    example: '1.0.0',
  })
  @IsString()
  @IsNotEmpty()
  policyVersion: string;

  @ApiProperty({
    description: 'Required adhesion percentage to emit notice',
    example: 25.0,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  requiredAdhesionPercentage: number;

  @ApiProperty({
    description: 'Structured agenda for the assembly',
    type: [AgendaItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgendaItemDto)
  agenda: AgendaItemDto[];
}