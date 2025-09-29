
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { KeyManagementService } from './key-management.service';
import { SigningKey, KeyStatus } from '../entities/signing-key.entity';
import * as jose from 'node-jose';

// Mock TypeORM Repository
type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = (): MockRepository<SigningKey> => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
});

describe('KeyManagementService', () => {
  let service: KeyManagementService;
  let repository: MockRepository<SigningKey>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeyManagementService,
        {
          provide: getRepositoryToken(SigningKey),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<KeyManagementService>(KeyManagementService);
    repository = module.get<MockRepository<SigningKey>>(getRepositoryToken(SigningKey));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateNewKey', () => {
    it('should generate and save a new active key', async () => {
      const tenantId = 'tenant-1';
      const mockKey = {
        kid: 'new-key-kid',
        tenant_id: tenantId,
        status: KeyStatus.ACTIVE,
        public_key_jwk: { kty: 'EC', crv: 'P-256', /* ... */ },
        private_key_pem: '-----BEGIN PRIVATE KEY-----',
      };

      repository.create.mockReturnValue(mockKey);
      repository.save.mockResolvedValue(mockKey);

      const result = await service.generateNewKey(tenantId);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenantId, status: KeyStatus.ACTIVE }));
      expect(repository.save).toHaveBeenCalledWith(mockKey);
      expect(result).toEqual(mockKey);
    });
  });

  describe('getActiveSigningKey', () => {
    it('should return an existing active key if found', async () => {
      const tenantId = 'tenant-1';
      const activeKey = { kid: 'active-key' } as SigningKey;
      repository.findOne.mockResolvedValue(activeKey);
      const generateNewKeySpy = jest.spyOn(service, 'generateNewKey');

      const result = await service.getActiveSigningKey(tenantId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { tenant_id: tenantId, status: KeyStatus.ACTIVE },
        order: { created_at: 'DESC' },
      });
      expect(generateNewKeySpy).not.toHaveBeenCalled();
      expect(result).toEqual(activeKey);
    });

    it('should generate a new key if no active key is found', async () => {
      const tenantId = 'tenant-1';
      const newKey = { kid: 'new-key' } as SigningKey;
      repository.findOne.mockResolvedValue(null);
      // Mock the internal call to generateNewKey
      const generateNewKeySpy = jest.spyOn(service, 'generateNewKey').mockResolvedValue(newKey);

      const result = await service.getActiveSigningKey(tenantId);

      expect(repository.findOne).toHaveBeenCalled();
      expect(generateNewKeySpy).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(newKey);
    });
  });

  describe('findKeyById', () => {
    it('should find a key by its kid', async () => {
      const kid = 'some-kid';
      const key = { kid } as SigningKey;
      repository.findOne.mockResolvedValue(key);

      const result = await service.findKeyById(kid);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { kid } });
      expect(result).toEqual(key);
    });
  });

  describe('getJwksForTenant', () => {
    it('should return a JWKS for active and rolled-over keys', async () => {
      const tenantId = 'tenant-1';
      const keys = [
        { kid: 'active-key', status: KeyStatus.ACTIVE, algorithm: 'ES256', public_key_jwk: { kty: 'EC', kid: 'active-key' } },
        { kid: 'rolled-key', status: KeyStatus.ROLLED_OVER, algorithm: 'ES256', public_key_jwk: { kty: 'EC', kid: 'rolled-key' } },
        { kid: 'expired-key', status: KeyStatus.EXPIRED, algorithm: 'ES256', public_key_jwk: { kty: 'EC', kid: 'expired-key' } },
      ] as SigningKey[];

      repository.find.mockResolvedValue(keys.slice(0, 2)); // Return only active and rolled-over

      const result = await service.getJwksForTenant(tenantId);

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          tenant_id: tenantId,
          status: In([KeyStatus.ACTIVE, KeyStatus.ROLLED_OVER]),
        },
      });

      expect(result.keys).toHaveLength(2);
      expect(result.keys.every(k => k['use'] === 'sig')).toBe(true);
      expect(result.keys.every(k => k['alg'] === 'ES256')).toBe(true);
      expect(result.keys.some(k => k['kid'] === 'active-key')).toBe(true);
      expect(result.keys.some(k => k['kid'] === 'rolled-key')).toBe(true);
      expect(result.keys.some(k => k['kid'] === 'expired-key')).toBe(false);
    });

    it('should return an empty key set if no valid keys are found', async () => {
        const tenantId = 'tenant-empty';
        repository.find.mockResolvedValue([]);
  
        const result = await service.getJwksForTenant(tenantId);
  
        expect(repository.find).toHaveBeenCalled();
        expect(result.keys).toHaveLength(0);
      });
  });
});
