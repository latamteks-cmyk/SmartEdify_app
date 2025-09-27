import { Controller, Get, Query } from '@nestjs/common';
import { OidcDiscoveryService } from './oidc-discovery.service';

@Controller('.well-known')
export class OidcDiscoveryController {
  constructor(private readonly oidcDiscoveryService: OidcDiscoveryService) {}

  @Get('openid-configuration')
  getOidcConfiguration(@Query('tenant_id') tenantId: string) {
    return this.oidcDiscoveryService.getOidcConfiguration(tenantId);
  }
}
