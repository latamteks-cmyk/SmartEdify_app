import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsArray,
  IsOptional,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubjectDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'User roles',
    example: ['OWNER', 'BOARD_MEMBER'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  roles: string[];

  @ApiPropertyOptional({
    description: 'Additional user attributes',
    example: { hasVotingRights: true, isEligible: true, aliquot: 0.025 },
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

export class PolicyEvaluationDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({
    description: 'Country code',
    example: 'PE',
  })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({
    description: 'Action to evaluate',
    example: 'assembly:create',
    enum: [
      'assembly:create',
      'assembly:join', 
      'assembly:vote',
      'reservation:create',
      'reservation:cancel',
      'streaming:validate_attendance',
      'streaming:moderate',
      'data:export',
      'data:delete',
      'finance:view_statements',
      'finance:approve_budget'
    ]
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({
    description: 'Resource being accessed',
    example: 'assembly:123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiProperty({
    description: 'Subject (user) requesting access',
    type: SubjectDto,
  })
  @ValidateNested()
  @Type(() => SubjectDto)
  subject: SubjectDto;

  @ApiPropertyOptional({
    description: 'Additional context for evaluation',
    example: {
      scheduledDate: '2025-02-15T10:00:00Z',
      noticeDate: '2025-01-01T10:00:00Z',
      modality: 'MIXTA',
      amenityType: 'piscina',
      partySize: 10,
      amenityCapacity: 20,
      validationMethod: 'QR'
    },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}