import { Test, TestingModule } from '@nestjs/testing';
import { WebauthnService } from '../../../../src/modules/webauthn/webauthn.service';
import { RpService } from '../../../../src/modules/webauthn/rp.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebAuthnCredential } from '../../../../src/modules/webauthn/entities/webauthn-credential.entity';

describe('WebauthnService', () => {
  let service: WebauthnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebauthnService,
        RpService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WebAuthnCredential),
          useValue: {
            create: jest.fn((dto) => dto),
            save: jest.fn(async (dto) => dto),
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<WebauthnService>(WebauthnService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle credential registration', async () => {
    expect(service.generateRegistrationOptions).toBeDefined();
    expect(service.verifyRegistration).toBeDefined();
  });

  it('should handle credential authentication', async () => {
    expect(service['challengeStore']).toBeDefined();
    expect(service).toHaveProperty('toBuffer');
  });
});
