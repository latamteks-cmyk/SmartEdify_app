import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty, IsOptional, IsObject, Length, Matches } from 'class-validator';
import { TenantType } from '../entities/tenant.entity';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Type of tenant',
    enum: TenantType,
    example: TenantType.ADMINISTRADORA,
  })
  @IsEnum(TenantType)
  @IsNotEmpty()
  type: TenantType;

  @ApiProperty({
    description: 'Legal name of the tenant organization',
    example: 'Gestora Inmobiliaria XYZ S.A.C.',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  legal_name: string;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'PE',
    pattern: '^[A-Z]{2}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}$/, {
    message: 'country_code must be a valid ISO 3166-1 alpha-2 code (e.g., PE, US, MX)',
  })
  country_code: string;

  @ApiProperty({
    description: 'Additional metadata for the tenant',
    example: {
      tax_id: '20123456789',
      contact_email: 'admin@gestora.com',
      phone: '+51987654321',
      website: 'https://gestora.com',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}