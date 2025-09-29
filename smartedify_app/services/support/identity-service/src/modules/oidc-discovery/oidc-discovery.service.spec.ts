import { OidcDiscoveryService } from './oidc-discovery.service';

describe('OidcDiscoveryService', () => {
  it('debe exponer metadata OIDC multi-tenant con jwks_uri correcto', () => {
    const service = new OidcDiscoveryService();
    const tenantId = 'tenant-123';
    const config = service.getOidcConfiguration(tenantId);

    expect(config.issuer).toBe(`https://auth.smartedify.global/t/${tenantId}`);
    expect(config.jwks_uri).toBe(`https://auth.smartedify.global/.well-known/jwks.json?tenant_id=${tenantId}`);
    expect(config.id_token_signing_alg_values_supported).toEqual(['ES256']);
    expect(config.token_endpoint_auth_signing_alg_values_supported).toEqual(['ES256']);
    expect(config.grant_types_supported).toContain('refresh_token');
  });
});
