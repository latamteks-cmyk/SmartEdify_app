import {
  IsObject,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateMinutesDto {
  @ApiProperty({
    description: 'Legal verdict from compliance service (required for closing)',
    example: {
      policyId: '123e4567-e89b-12d3-a456-426614174000',
      policyVersion: '1.0.0',
      verdict: 'APPROVED',
      signature: 'legal_signature_string',
      timestamp: '2025-03-15T14:00:00Z',
    },
  })
  @IsObject()
  @IsNotEmpty()
  legalVerdict: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional notes for the minutes',
    example: 'Asamblea realizada sin incidentes',
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}