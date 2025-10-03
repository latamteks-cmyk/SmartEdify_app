import { Test, TestingModule } from '@nestjs/testing';
import { KeyManagementService } from '../../../../src/modules/keys/services/key-management.service';
import { Repository } from 'typeorm';
import { SigningKey } from '../../../../src/modules/keys/entities/signing-key.entity';

describe('KeyManagementService', () => {
  let service: KeyManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeyManagementService,
        {
          provide: 'SigningKeyRepository',
          useClass: Repository<SigningKey>,
        },
      ],
    }).compile();

    service = module.get<KeyManagementService>(KeyManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate new signing keys', async () => {
    expect(service.generateNewKey).toBeDefined();
  });

  it('should get active signing key for tenant', async () => {
    expect(service.getActiveSigningKey).toBeDefined();
  });

  it('should get JWKS for tenant', async () => {
    expect(service.getJwksForTenant).toBeDefined();
  });
});