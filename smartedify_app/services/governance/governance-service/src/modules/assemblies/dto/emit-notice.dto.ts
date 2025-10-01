import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmitNoticeDto {
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
    description: 'Scheduled date for the assembly',
    example: '2025-03-15T10:00:00Z',
  })
  @IsDateString()
  scheduledDate: string;
}