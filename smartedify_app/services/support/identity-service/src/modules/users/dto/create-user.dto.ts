import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  Equals,
} from 'class-validator';

export class CreateUserDto {
  @IsUUID()
  @IsNotEmpty()
  tenant_id: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsBoolean()
  @Equals(true, { message: 'Consent must be accepted' })
  consent_granted: boolean;

  @IsString()
  @IsOptional()
  policy_version?: string;
}
