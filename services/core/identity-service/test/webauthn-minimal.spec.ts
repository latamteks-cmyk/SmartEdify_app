import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebauthnService } from '../src/modules/webauthn/webauthn.service';
import { WebAuthnCredential } from '../src/modules/webauthn/entities/webauthn-credential.entity';
import { Repository } from 'typeorm';
import { UsersService } from '../src/modules/users/users.service';
import { RpService } from '../src/modules/webauthn/rp.service';

// Minimal test to debug the issue
describe('WebauthnService - Minimal Test', () => {
  let service: WebauthnService;

  beforeEach(async () => {
    try {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebauthnService,
          {
            provide: RpService,
            useValue: {
              getRpName: jest.fn().mockReturnValue('Test RP'),
              getRpId: jest.fn().mockReturnValue('test.com'),
              getExpectedOrigin: jest.fn().mockReturnValue('https://test.com'),
            },
          },
          {
            provide: UsersService,
            useValue: {
              findByEmail: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
              findById: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
            },
          },
          {
            provide: getRepositoryToken(WebAuthnCredential),
            useClass: Repository,
          },
        ],
      }).compile();

      service = module.get<WebauthnService>(WebauthnService);
    } catch (error) {
      console.error('Error creating test module:', error);
      throw error;
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});