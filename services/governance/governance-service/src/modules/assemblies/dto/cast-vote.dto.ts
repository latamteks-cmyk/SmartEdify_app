import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VoteChoice } from '../entities/digital-vote.entity';

export class CastVoteDto {
  @ApiProperty({
    description: 'Vote choice',
    enum: VoteChoice,
    example: VoteChoice.FAVOR,
  })
  @IsEnum(VoteChoice)
  choice: VoteChoice;

  @ApiProperty({
    description: 'Event ID for idempotency',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  eventId: string;
}

export class CastManualVoteDto {
  @ApiProperty({
    description: 'Owner ID who is voting',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  ownerId: string;

  @ApiProperty({
    description: 'Vote choice',
    enum: VoteChoice,
    example: VoteChoice.FAVOR,
  })
  @IsEnum(VoteChoice)
  choice: VoteChoice;

  @ApiProperty({
    description: 'Event ID for idempotency',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  eventId: string;

  @ApiPropertyOptional({
    description: 'Evidence reference (encrypted reference to evidence)',
    example: 'evidence_ref_encrypted_string',
  })
  @IsOptional()
  @IsString()
  evidenceRef?: string;
}