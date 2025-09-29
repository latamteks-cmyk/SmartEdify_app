import { OidcDiscoveryService } from './oidc-discovery.service';

describe('OidcDiscoveryService', () => {
  it('should expose tenant-scoped metadata with ES256 algorithms', () => {
    const service = new OidcDiscoveryService();
    const config = service.getOidcConfiguration('tenant-123');

    expect(config.issuer).toBe('https://auth.smartedify.global/t/tenant-123');
    expect(config.jwks_uri).toBe('https://auth.smartedify.global/t/tenant-123/.well-known/jwks.json');
    expect(config.id_token_signing_alg_values_supported).toEqual(['ES256']);
    expect(config.token_endpoint_auth_signing_alg_values_supported).toEqual(['ES256']);
    expect(config.grant_types_supported).toContain('refresh_token');
  });
});
