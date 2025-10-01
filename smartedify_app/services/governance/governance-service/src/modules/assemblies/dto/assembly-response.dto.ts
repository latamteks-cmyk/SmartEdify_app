import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssemblyModality, AssemblyStatus } from '../entities/assembly.entity';

export class AssemblyResponseDto {
  @ApiProperty({
    description: 'Assembly ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Assembly code',
    example: 'ASM-2025-001',
  })
  code: string;

  @ApiProperty({
    description: 'Assembly title',
    example: 'Asamblea Ordinaria Anual 2025',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Assembly description',
    example: 'Asamblea para aprobar presupuesto y elegir nueva junta directiva',
  })
  description?: string;

  @ApiProperty({
    description: 'Assembly start time',
    example: '2025-03-15T10:00:00Z',
  })
  startTime: string;

  @ApiProperty({
    description: 'Assembly end time',
    example: '2025-03-15T14:00:00Z',
  })
  endTime: string;

  @ApiProperty({
    description: 'Assembly modality',
    enum: AssemblyModality,
    example: AssemblyModality.MIXTA,
  })
  modality: AssemblyModality;

  @ApiProperty({
    description: 'Assembly status',
    enum: AssemblyStatus,
    example: AssemblyStatus.SCHEDULED,
  })
  status: AssemblyStatus;

  @ApiProperty({
    description: 'User ID who created the assembly',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  createdBy: string;

  @ApiProperty({
    description: 'Policy ID from compliance service',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  policyId: string;

  @ApiProperty({
    description: 'Policy version from compliance service',
    example: '1.0.0',
  })
  policyVersion: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T10:00:00Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Array of document URLs attached to the assembly',
    example: ['https://docs.example.com/reglamento.pdf'],
  })
  attachments?: string[];
}