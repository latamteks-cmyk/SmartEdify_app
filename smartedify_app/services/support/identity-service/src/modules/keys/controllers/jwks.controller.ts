import { Controller, Get, Query, BadRequestException, Param } from '@nestjs/common';
import { KeyManagementService } from '../services/key-management.service';

@Controller()
export class JwksController {
  constructor(private readonly keyManagementService: KeyManagementService) {}

  @Get(['.well-known/jwks.json', 't/:tenantId/.well-known/jwks.json'])
  async getJwksForTenant(
    @Query('tenant_id') tenantIdQuery?: string,
    @Param('tenantId') tenantIdParam?: string,
  ) {
    const tenantId = tenantIdParam || tenantIdQuery;
    if (!tenantId) {
      throw new BadRequestException('tenant identifier is required.');
    }
    return this.keyManagementService.getJwksForTenant(tenantId);
  }
}
