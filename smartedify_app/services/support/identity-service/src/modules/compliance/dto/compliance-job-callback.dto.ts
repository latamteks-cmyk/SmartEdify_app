import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { ComplianceJobServiceStatus } from '../types/compliance-job.enums';

export class ComplianceJobCallbackDto {
  @IsString()
  service_name: string;

  @IsEnum(ComplianceJobServiceStatus)
  status: ComplianceJobServiceStatus;

  @IsOptional()
  @IsString()
  error_message?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
