import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProxyVoteDto {
  @ApiProperty({
    description: 'Assembly ID for the proxy vote',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  assemblyId: string;

  @ApiProperty({
    description: 'Grantee user ID (who will vote on behalf)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  granteeId: string;

  @ApiProperty({
    description: 'Expiration date of the proxy',
    example: '2025-03-15T14:00:00Z',
  })
  @IsDateString()
  expiresAt: string;

  @ApiPropertyOptional({
    description: 'URL to the signed proxy document',
    example: 'https://docs.example.com/proxy-vote-signed.pdf',
  })
  @IsOptional()
  @IsString()
  documentUrl?: string;

  @ApiPropertyOptional({
    description: 'Digital signature of the proxy document',
    example: 'digital_signature_string',
  })
  @IsOptional()
  @IsString()
  digitalSignature?: string;
}