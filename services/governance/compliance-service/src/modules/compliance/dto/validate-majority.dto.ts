import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateMajorityDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({
    description: 'Vote ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  @IsNotEmpty()
  voteId: string;

  @ApiProperty({
    description: 'Country code',
    example: 'PE',
  })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({
    description: 'Votes in favor',
    example: 35,
  })
  @IsNumber()
  @Min(0)
  votesFor: number;

  @ApiProperty({
    description: 'Votes against',
    example: 10,
  })
  @IsNumber()
  @Min(0)
  votesAgainst: number;

  @ApiProperty({
    description: 'Abstentions',
    example: 5,
  })
  @IsNumber()
  @Min(0)
  abstentions: number;

  @ApiProperty({
    description: 'Vote topic type',
    example: 'BUDGET_APPROVAL',
  })
  @IsString()
  @IsNotEmpty()
  voteType: string;

  @ApiProperty({
    description: 'Assembly type',
    example: 'ORDINARY',
  })
  @IsString()
  @IsNotEmpty()
  assemblyType: string;
}