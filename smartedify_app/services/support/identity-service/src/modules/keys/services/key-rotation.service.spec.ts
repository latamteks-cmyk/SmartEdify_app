import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KeyRotationService } from './key-rotation.service';
import { KeyManagementService } from './key-management.service';
import { SigningKey, KeyStatus } from '../entities/signing-key.entity';

describe('KeyRotationService', () => {
  let service: KeyRotationService;
  let mockRepository: jest.Mocked<Repository<SigningKey>>;
  let mockKeyManagementService: jest.Mocked<KeyManagementService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeyRotationService,
        {
          provide: getRepositoryToken(SigningKey),
          useValue: {
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: KeyManagementService,
          useValue: {
            generateNewKey: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<KeyRotationService>(KeyRotationService);
    mockRepository = module.get(getRepositoryToken(SigningKey));
    mockKeyManagementService = module.get(KeyManagementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCron', () => {
    it('should call rotation and expiration methods', async () => {
      // @ts-expect-error: Testing private method
      const rotateSpy = jest
        .spyOn(service, 'rotateExpiredActiveKeys')
        .mockResolvedValue(undefined);
      // @ts-expect-error: Testing private method
      const expireSpy = jest
        .spyOn(service, 'expireRolledOverKeys')
        .mockResolvedValue(undefined);

      await service.handleCron();

      expect(rotateSpy).toHaveBeenCalled();
      expect(expireSpy).toHaveBeenCalled();
    });
  });

  describe('rotateExpiredActiveKeys', () => {
    it('should do nothing if no keys need rotation', async () => {
      mockRepository.find.mockResolvedValue([]);
      // @ts-expect-error: Testing private method
      await service['rotateExpiredActiveKeys']();
      expect(mockRepository.find).toHaveBeenCalled();
      expect(mockKeyManagementService.generateNewKey).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should rotate old active keys', async () => {
      const now = new Date();
      const oldKey: SigningKey = {
        kid: 'old-key',
        tenant_id: 'tenant-1',
        status: KeyStatus.ACTIVE,
        public_key_jwk: { kty: 'EC', kid: 'old-key' } as any,
        private_key_pem: '-----BEGIN PRIVATE KEY-----',
        algorithm: 'ES256',
        expires_at: new Date(now.getTime() + 1000000),
        created_at: now,
        updated_at: now,
      };
      const newKey: SigningKey = { ...oldKey, kid: 'new-key' };
      mockRepository.find.mockResolvedValue([oldKey]);
      mockKeyManagementService.generateNewKey.mockResolvedValue(newKey);
      mockRepository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      // @ts-expect-error: Testing private method
      await service['rotateExpiredActiveKeys']();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(mockKeyManagementService.generateNewKey).toHaveBeenCalledWith(
        oldKey.tenant_id,
      );
      expect(mockRepository.update).toHaveBeenCalledWith(
        oldKey.kid,
        expect.objectContaining({ status: KeyStatus.ROLLED_OVER }),
      );
    });
  });

  describe('expireRolledOverKeys', () => {
    it('should do nothing if no keys need expiration', async () => {
      mockRepository.find.mockResolvedValue([]);
      // @ts-expect-error: Testing private method
      await service['expireRolledOverKeys']();
      expect(mockRepository.find).toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should expire old rolled-over keys', async () => {
      const now = new Date();
      const oldKey: SigningKey = {
        kid: 'old-rolled-key',
        tenant_id: 'tenant-1',
        status: KeyStatus.ROLLED_OVER,
        public_key_jwk: { kty: 'EC', kid: 'old-rolled-key' } as any,
        private_key_pem: '-----BEGIN PRIVATE KEY-----',
        algorithm: 'ES256',
        expires_at: new Date(now.getTime() + 1000000),
        created_at: now,
        updated_at: now,
      };
      mockRepository.find.mockResolvedValue([oldKey]);
      mockRepository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      // @ts-expect-error: Testing private method
      await service['expireRolledOverKeys']();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(mockRepository.update).toHaveBeenCalledWith(
        oldKey.kid,
        expect.objectContaining({ status: KeyStatus.EXPIRED }),
      );
    });
  });
});
