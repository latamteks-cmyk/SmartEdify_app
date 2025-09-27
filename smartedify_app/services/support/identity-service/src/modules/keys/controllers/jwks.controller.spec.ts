
import { Test, TestingModule } from '@nestjs/testing';
import { JwksController } from './jwks.controller';
import { KeyManagementService } from '../services/key-management.service';
import { BadRequestException } from '@nestjs/common';

// Mock KeyManagementService
const mockKeyManagementService = {
  getJwksForTenant: jest.fn(),
};

describe('JwksController', () => {
  let controller: JwksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JwksController],
      providers: [
        {
          provide: KeyManagementService,
          useValue: mockKeyManagementService,
        },
      ],
    }).compile();

    controller = module.get<JwksController>(JwksController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getJwksForTenant', () => {
    it('should throw BadRequestException if tenant_id is missing', async () => {
      await expect(controller.getJwksForTenant(undefined)).rejects.toThrow(
        new BadRequestException('tenant_id is a required query parameter.'),
      );
    });

    it('should call KeyManagementService.getJwksForTenant with the correct tenant_id', async () => {
      const tenantId = 'test-tenant';
      const jwks = { keys: [{ kty: 'EC', kid: '123' }] };
      mockKeyManagementService.getJwksForTenant.mockResolvedValue(jwks);

      const result = await controller.getJwksForTenant(tenantId);

      expect(mockKeyManagementService.getJwksForTenant).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(jwks);
    });

    it('should return the jwks provided by the service', async () => {
      const tenantId = 'another-tenant';
      const expectedJwks = { keys: [{ kty: 'EC', kid: '456' }] };
      mockKeyManagementService.getJwksForTenant.mockResolvedValue(expectedJwks);

      const result = await controller.getJwksForTenant(tenantId);

      expect(result).toEqual(expectedJwks);
    });
  });
});
