import { PartialType } from '@nestjs/swagger';
import { CreateProfileDto } from './create-profile.dto';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateProfileDto extends PartialType(CreateProfileDto) {
  @IsOptional()
  @IsUUID()
  tenantId?: string; // Make tenantId optional for updates
}