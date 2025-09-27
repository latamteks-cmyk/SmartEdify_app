import { IsEmail, IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

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
}