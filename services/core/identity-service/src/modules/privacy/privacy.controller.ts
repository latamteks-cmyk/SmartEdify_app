import { Controller, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrivacyService } from './privacy.service';

import { DpopGuard } from '../auth/guards/dpop.guard';

interface ExportDataDto {
  user_id: string;
  tenant_id: string;
  format?: 'json' | 'csv';
  include_services?: string[]; // ['governance-service', 'asset-management-service']
}

interface DeleteDataDto {
  user_id: string;
  tenant_id: string;
  verification_code: string; // OTP o código de verificación adicional
  reason?: string;
}

@ApiTags('Privacy & DSAR')
@Controller('/privacy')
@UseGuards(DpopGuard)
@ApiBearerAuth()
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Post('/export')
  @ApiOperation({
    summary: 'Export user data (DSAR)',
    description:
      'Asynchronous operation that exports user data across all services. Returns job_id for tracking.',
  })
  async exportUserData(@Body() request: ExportDataDto) {
    // Operación asíncrona con job_id
    // Orquestación con compliance-service
    // Webhook de finalización
    return this.privacyService.exportUserData(request);
  }

  @Delete('/data')
  @ApiOperation({
    summary: 'Delete user data (DSAR)',
    description:
      'Asynchronous operation that performs crypto-erase across all services. Returns job_id for tracking.',
  })
  async deleteUserData(@Body() request: DeleteDataDto) {
    // Operación asíncrona con job_id
    // Orquestación cross-service
    // Eventos Kafka para coordinación
    // Crypto-erase (eliminar claves de cifrado)
    return this.privacyService.deleteUserData(request);
  }
}
