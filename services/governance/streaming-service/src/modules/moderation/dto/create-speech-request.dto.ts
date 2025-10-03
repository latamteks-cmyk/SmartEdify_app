import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpeechRequestPriority } from '../entities/speech-request.entity';

export class CreateSpeechRequestDto {
  @ApiPropertyOptional({ description: 'Optional message explaining the request', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiProperty({ enum: SpeechRequestPriority, description: 'Request priority', default: SpeechRequestPriority.NORMAL })
  @IsEnum(SpeechRequestPriority)
  priority: SpeechRequestPriority = SpeechRequestPriority.NORMAL;
}