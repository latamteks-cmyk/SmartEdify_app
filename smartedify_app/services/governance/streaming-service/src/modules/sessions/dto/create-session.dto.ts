import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionModality } from '../entities/assembly-session.entity';

export class CreateSessionDto {
  @ApiProperty({ description: 'Assembly ID from governance-service' })
  @IsUUID()
  assemblyId: string;

  @ApiPropertyOptional({ description: 'Policy ID from compliance-service' })
  @IsOptional()
  @IsUUID()
  policyId?: string;

  @ApiPropertyOptional({ description: 'Policy version' })
  @IsOptional()
  @IsString()
  policyVersion?: string;

  @ApiProperty({ enum: SessionModality, description: 'Session modality' })
  @IsEnum(SessionModality)
  modality: SessionModality;

  @ApiPropertyOptional({ description: 'Video provider (google_meet, zoom, webrtc)', default: 'webrtc' })
  @IsOptional()
  @IsString()
  videoProvider?: string;

  @ApiPropertyOptional({ description: 'Maximum participants allowed', minimum: 1, maximum: 1000, default: 500 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxParticipants?: number;

  @ApiPropertyOptional({ description: 'Whether recording is enabled', default: true })
  @IsOptional()
  @IsBoolean()
  recordingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Whether transcription is enabled', default: true })
  @IsOptional()
  @IsBoolean()
  transcriptionEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Additional session metadata', type: 'object' })
  @IsOptional()
  metadata?: Record<string, any>;
}