import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CastVoteDto {
  @ApiProperty({ description: 'Selected vote option' })
  @IsString()
  option: string;

  @ApiPropertyOptional({ description: 'Optional comment for the vote' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Vote weight (for weighted voting)', default: 1 })
  @IsOptional()
  weight?: number;
}