import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export class RequestComplianceJobDto {
  @IsUUID()
  user_id: string;

  @IsUUID()
  tenant_id: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  affected_services?: string[];

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_tld: false })
  result_callback_url?: string;
}
