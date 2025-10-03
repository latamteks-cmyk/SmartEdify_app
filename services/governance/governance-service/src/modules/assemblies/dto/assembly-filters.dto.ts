import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssemblyStatus, AssemblyType } from '../enums/assembly.enums';

export class AssemblyFiltersDto {
  @ApiPropertyOptional({ enum: AssemblyStatus, description: 'Filter by assembly status' })
  @IsOptional()
  @IsEnum(AssemblyStatus)
  status?: AssemblyStatus;

  @ApiPropertyOptional({ enum: AssemblyType, description: 'Filter by assembly type' })
  @IsOptional()
  @IsEnum(AssemblyType)
  type?: AssemblyType;

  @ApiPropertyOptional({ description: 'Filter assemblies starting from this date', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Filter assemblies ending before this date', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endDate?: Date;
}