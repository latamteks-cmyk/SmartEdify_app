
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { KeyRotationService } from './key-rotation.service';
import { KeyManagementService } from './key-management.service';
import { SigningKey, KeyStatus } from '../entities/signing-key.entity';

// Mock KeyManagementService
const mockKeyManagementService = {
  generateNewKey: jest.fn(),
};

// Mock TypeORM Repository
type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = (): MockRepository<SigningKey> => ({
  find: jest.fn(),
  update: jest.fn(),
});

describe('KeyRotationService', () => {
  let service: KeyRotationService;
  let repository: MockRepository<SigningKey>;
  let keyManagementService: typeof mockKeyManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeyRotationService,
        {
          provide: KeyManagementService,
          useValue: mockKeyManagementService,
        },
        {
          provide: getRepositoryToken(SigningKey),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<KeyRotationService>(KeyRotationService);
    repository = module.get<MockRepository<SigningKey>>(getRepositoryToken(SigningKey));
    keyManagementService = module.get<typeof mockKeyManagementService>(KeyManagementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCron', () => {
    it('should call rotation and expiration methods', async () => {
      // Spy on the private methods
      const rotateSpy = jest.spyOn(service as any, 'rotateExpiredActiveKeys').mockResolvedValue(undefined);
      const expireSpy = jest.spyOn(service as any, 'expireRolledOverKeys').mockResolvedValue(undefined);

      await service.handleCron();

      expect(rotateSpy).toHaveBeenCalled();
      expect(expireSpy).toHaveBeenCalled();
    });
  });

  describe('rotateExpiredActiveKeys', () => {
    it('should do nothing if no keys need rotation', async () => {
      repository.find.mockResolvedValue([]);
      await (service as any).rotateExpiredActiveKeys();
      expect(repository.find).toHaveBeenCalled();
      expect(keyManagementService.generateNewKey).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should rotate old active keys', async () => {
      const oldKey = { kid: 'old-key', tenant_id: 'tenant-1' } as SigningKey;
      const newKey = { kid: 'new-key' } as SigningKey;
      repository.find.mockResolvedValue([oldKey]);
      keyManagementService.generateNewKey.mockResolvedValue(newKey);
      repository.update.mockResolvedValue({ affected: 1 });

      await (service as any).rotateExpiredActiveKeys();

      expect(repository.find).toHaveBeenCalled();
      expect(keyManagementService.generateNewKey).toHaveBeenCalledWith(oldKey.tenant_id);
      expect(repository.update).toHaveBeenCalledWith(oldKey.kid, {
        status: KeyStatus.ROLLED_OVER,
        updated_at: expect.any(Date),
      });
    });
  });

  describe('expireRolledOverKeys', () => {
    it('should do nothing if no keys need expiration', async () => {
      repository.find.mockResolvedValue([]);
      await (service as any).expireRolledOverKeys();
      expect(repository.find).toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should expire old rolled-over keys', async () => {
      const oldKey = { kid: 'old-rolled-key', tenant_id: 'tenant-1' } as SigningKey;
      repository.find.mockResolvedValue([oldKey]);
      repository.update.mockResolvedValue({ affected: 1 });

      await (service as any).expireRolledOverKeys();

      expect(repository.find).toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(oldKey.kid, {
        status: KeyStatus.EXPIRED,
        updated_at: expect.any(Date),
      });
    });
  });
});
