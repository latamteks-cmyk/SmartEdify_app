import { IsString, IsEnum, IsDateString, IsOptional, IsNumber, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssemblyType, VotingType } from '../enums/assembly.enums';

export class CreateAssemblyDto {
  @ApiProperty({ description: 'Assembly title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Assembly description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AssemblyType, description: 'Type of assembly' })
  @IsEnum(AssemblyType)
  type: AssemblyType;

  @ApiProperty({ description: 'Assembly start date', type: 'string', format: 'date-time' })
  @IsDateString()
  startDate: Date;

  @ApiProperty({ description: 'Assembly end date', type: 'string', format: 'date-time' })
  @IsDateString()
  endDate: Date;

  @ApiPropertyOptional({ description: 'Assembly location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Virtual meeting URL' })
  @IsOptional()
  @IsString()
  virtualUrl?: string;

  @ApiPropertyOptional({ description: 'Maximum number of participants', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxParticipants?: number;

  @ApiPropertyOptional({ description: 'Minimum quorum percentage', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quorumPercentage?: number;

  @ApiPropertyOptional({ enum: VotingType, description: 'Default voting type for this assembly' })
  @IsOptional()
  @IsEnum(VotingType)
  defaultVotingType?: VotingType;

  @ApiPropertyOptional({ description: 'Assembly agenda items', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agenda?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata', type: 'object' })
  @IsOptional()
  metadata?: Record<string, any>;
}