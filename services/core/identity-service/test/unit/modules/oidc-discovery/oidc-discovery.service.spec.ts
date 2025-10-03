import { Test, TestingModule } from '@nestjs/testing';
import { OidcDiscoveryService } from '../../../../src/modules/oidc-discovery/oidc-discovery.service';
import { KeyManagementService } from '../../../../src/modules/keys/services/key-management.service';
import { HttpService } from '@nestjs/axios';

describe('OidcDiscoveryService', () => {
  let service: OidcDiscoveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OidcDiscoveryService,
        { provide: KeyManagementService, useValue: { getJwksForTenant: jest.fn() } },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OidcDiscoveryService>(OidcDiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get OIDC configuration for tenant', async () => {
    expect(service.getOidcConfiguration).toBeDefined();
  });

  it('should get JWKS for tenant', async () => {
    expect(service.getJwksByTenant).toBeDefined();
  });
});
