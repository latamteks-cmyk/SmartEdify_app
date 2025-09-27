import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { KeyManagementService } from '../services/key-management.service';

@Controller()
export class JwksController {
  constructor(private readonly keyManagementService: KeyManagementService) {}

  @Get('.well-known/jwks.json')
  async getJwksForTenant(@Query('tenant_id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is a required query parameter.');
    }
    return this.keyManagementService.getJwksForTenant(tenantId);
  }
}
