import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OidcDiscoveryService } from './oidc-discovery.service';

@ApiTags('OIDC Discovery')
@Controller()
export class OidcDiscoveryController {
  constructor(private readonly oidcDiscoveryService: OidcDiscoveryService) {}

  @Get('/.well-known/openid-configuration')
  @ApiOperation({ summary: 'Get OpenID Connect configuration by tenant' })
  @ApiQuery({
    name: 'tenant_id',
    required: true,
    description: 'Tenant identifier',
  })
  async getOpenIdConfiguration(@Query('tenant_id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }

    return this.oidcDiscoveryService.getOidcConfiguration(tenantId);
  }

  @Get('/.well-known/jwks.json')
  @ApiOperation({ summary: 'Get JSON Web Key Set by tenant' })
  @ApiQuery({
    name: 'tenant_id',
    required: true,
    description: 'Tenant identifier',
  })
  async getJwks(@Query('tenant_id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }

    return this.oidcDiscoveryService.getJwksByTenant(tenantId);
  }
}
