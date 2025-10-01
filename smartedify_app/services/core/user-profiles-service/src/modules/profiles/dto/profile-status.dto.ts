import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProfileStatus } from '../entities/user-profile.entity';

export class ProfileStatusDto {
  @ApiProperty({
    description: 'New status for the profile',
    enum: ProfileStatus,
    example: ProfileStatus.ACTIVE,
  })
  @IsEnum(ProfileStatus)
  status: ProfileStatus;

  @ApiPropertyOptional({
    description: 'Reason for status change',
    example: 'Email verification completed',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the status change',
    example: { verificationMethod: 'email', verifiedAt: '2025-01-01T12:00:00Z' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}