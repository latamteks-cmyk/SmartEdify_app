import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EndSessionDto {
  @ApiPropertyOptional({ description: 'Merkle root from governance event stream' })
  @IsOptional()
  @IsString()
  merkleRoot?: string;

  @ApiPropertyOptional({ description: 'Commit height from governance event stream' })
  @IsOptional()
  @IsNumber()
  commitHeight?: number;

  @ApiPropertyOptional({ description: 'Reason for ending the session' })
  @IsOptional()
  @IsString()
  reason?: string;
}