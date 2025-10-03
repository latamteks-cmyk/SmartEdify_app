import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterAttendeeDto {
  @ApiProperty({ description: 'User ID to register' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Optional notes from moderator' })
  @IsOptional()
  @IsString()
  notes?: string;
}