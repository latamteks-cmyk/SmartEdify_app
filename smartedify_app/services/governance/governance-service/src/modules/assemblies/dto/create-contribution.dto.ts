import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionMediaType } from '../entities/community-contribution.entity';

export class CreateContributionDto {
  @ApiProperty({
    description: 'Contribution content',
    example: 'Sugiero que se incluya un punto sobre el mantenimiento de las áreas verdes',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiProperty({
    description: 'Media type of the contribution',
    enum: ContributionMediaType,
    example: ContributionMediaType.TEXT,
  })
  @IsEnum(ContributionMediaType)
  mediaType: ContributionMediaType;

  @ApiPropertyOptional({
    description: 'Media URL (for audio, video, document contributions)',
    example: 'https://media.example.com/audio/contribution.mp3',
  })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}