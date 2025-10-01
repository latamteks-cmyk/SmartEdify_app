import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidationMethod } from '../entities/session-attendee.entity';

export class ValidateAttendanceDto {
  @ApiProperty({
    description: 'Validation method used',
    enum: ValidationMethod,
    example: ValidationMethod.BIOMETRIC,
  })
  @IsEnum(ValidationMethod)
  validationMethod: ValidationMethod;

  @ApiPropertyOptional({
    description: 'Validation code (for SMS/EMAIL methods)',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  validationCode?: string;

  @ApiPropertyOptional({
    description: 'Biometric token (for BIOMETRIC method)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsOptional()
  @IsString()
  biometricToken?: string;

  @ApiPropertyOptional({
    description: 'QR code data (for QR methods)',
    example: 'qr_data_string',
  })
  @IsOptional()
  @IsString()
  qrData?: string;
}