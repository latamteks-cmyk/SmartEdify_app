import { IsString, IsEnum, IsDateString, IsOptional, IsUUID, IsArray, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VotingType } from '../../assemblies/enums/assembly.enums';

export class CreateVoteDto {
  @ApiProperty({ description: 'Assembly ID this vote belongs to' })
  @IsUUID()
  assemblyId: string;

  @ApiPropertyOptional({ description: 'Session ID this vote belongs to' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({ description: 'Vote title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Vote description' })
  @IsString()
  description: string;

  @ApiProperty({ enum: VotingType, description: 'Type of voting mechanism' })
  @IsEnum(VotingType)
  votingType: VotingType;

  @ApiProperty({ description: 'Vote start time', type: 'string', format: 'date-time' })
  @IsDateString()
  startTime: Date;

  @ApiProperty({ description: 'Vote end time', type: 'string', format: 'date-time' })
  @IsDateString()
  endTime: Date;

  @ApiProperty({ description: 'Vote options', type: [String] })
  @IsArray()
  @IsString({ each: true })
  options: string[];

  @ApiPropertyOptional({ description: 'Required quorum percentage', minimum: 0, maximum: 100, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  requiredQuorum?: number;

  @ApiPropertyOptional({ description: 'Required majority percentage', minimum: 0, maximum: 100, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  requiredMajority?: number;

  @ApiPropertyOptional({ description: 'Anonymous voting flag', default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: 'Allow vote changes flag', default: false })
  @IsOptional()
  @IsBoolean()
  allowChanges?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata', type: 'object' })
  @IsOptional()
  metadata?: Record<string, any>;
}