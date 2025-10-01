import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateBiometricDto {
  @ApiProperty({ description: 'Biometric data (will be sent to identity-service and never stored)' })
  @IsString()
  biometricData: string;
}