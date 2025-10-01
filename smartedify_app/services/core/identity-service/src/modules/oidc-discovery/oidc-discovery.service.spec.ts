import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { OidcDiscoveryService } from './oidc-discovery.service';
import { KeyManagementService } from '../keys/services/key-management.service';
import { of } from 'rxjs';

describe('OidcDiscoveryService', () => {
  let service: OidcDiscoveryService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OidcDiscoveryService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: KeyManagementService,
          useValue: {
            getJwksForTenant: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<OidcDiscoveryService>(OidcDiscoveryService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('debe exponer metadata OIDC multi-tenant con jwks_uri correcto', async () => {
    const tenantId = 'tenant-123';

    // Mock successful tenant validation
    jest.spyOn(httpService, 'get').mockReturnValue(
      of({
        status: 200,
        data: { id: tenantId, name: 'Test Tenant' },
      } as any),
    );

    const config = await service.getOidcConfiguration(tenantId);

    expect(config.issuer).toBe(`https://auth.smartedify.global/t/${tenantId}`);
    expect(config.jwks_uri).toBe(
      `https://auth.smartedify.global/.well-known/jwks.json?tenant_id=${tenantId}`,
    );
    expect(config.id_token_signing_alg_values_supported).toEqual([
      'ES256',
      'EdDSA',
    ]);
    expect(config.grant_types_supported).toContain('refresh_token');
    expect(config.dpop_signing_alg_values_supported).toEqual([
      'ES256',
      'EdDSA',
    ]);
  });
});
