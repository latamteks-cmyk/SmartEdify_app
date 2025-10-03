import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateQuorumDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({
    description: 'Assembly ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  assemblyId: string;

  @ApiProperty({
    description: 'Country code',
    example: 'PE',
  })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({
    description: 'Current attendance count',
    example: 45,
  })
  @IsNumber()
  @Min(0)
  currentAttendance: number;

  @ApiProperty({
    description: 'Total eligible voters',
    example: 100,
  })
  @IsNumber()
  @Min(1)
  totalEligible: number;

  @ApiProperty({
    description: 'Call number (1 for first call, 2 for second call)',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  @Max(2)
  callNumber: number;

  @ApiProperty({
    description: 'Assembly type',
    example: 'ORDINARY',
  })
  @IsString()
  @IsNotEmpty()
  assemblyType: string;
}