import { IsString, IsEnum, IsDateString, IsOptional, IsUUID, IsArray, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionType } from '../entities/session.entity';

export class CreateSessionDto {
  @ApiProperty({ description: 'Assembly ID this session belongs to' })
  @IsUUID()
  assemblyId: string;

  @ApiProperty({ description: 'Session title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Session description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: SessionType, description: 'Type of session' })
  @IsEnum(SessionType)
  type: SessionType;

  @ApiProperty({ description: 'Session start time', type: 'string', format: 'date-time' })
  @IsDateString()
  startTime: Date;

  @ApiProperty({ description: 'Session end time', type: 'string', format: 'date-time' })
  @IsDateString()
  endTime: Date;

  @ApiPropertyOptional({ description: 'Session duration in minutes', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Session agenda items', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agenda?: string[];

  @ApiPropertyOptional({ description: 'Session moderator user ID' })
  @IsOptional()
  @IsUUID()
  moderatorId?: string;

  @ApiPropertyOptional({ description: 'Session notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Session recording URL' })
  @IsOptional()
  @IsString()
  recordingUrl?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', type: 'object' })
  @IsOptional()
  metadata?: Record<string, any>;
}