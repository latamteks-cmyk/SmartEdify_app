import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CodeValidationMethod {
  SMS = 'sms',
  EMAIL = 'email',
}

export class ValidateCodeDto {
  @ApiProperty({ description: 'Verification code' })
  @IsString()
  code: string;

  @ApiProperty({ enum: CodeValidationMethod, description: 'Validation method used' })
  @IsEnum(CodeValidationMethod)
  method: CodeValidationMethod;
}