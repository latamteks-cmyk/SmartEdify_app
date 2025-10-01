import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebauthnService } from '../../src/modules/webauthn/webauthn.service';
import { WebAuthnCredential } from '../../src/modules/webauthn/entities/webauthn-credential.entity';
import { Repository } from 'typeorm';

describe('WebauthnService (unit)', () => {
  let service: WebauthnService;
  let repo: Repository<WebAuthnCredential>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebauthnService,
        {
          provide: getRepositoryToken(WebAuthnCredential),
          useValue: {
            create: jest.fn((dto) => dto),
            save: jest.fn((dto) => dto),
          },
        },
        {
          provide: 'RpService',
          useValue: {
            getRpId: () => 'localhost',
            getExpectedOrigin: () => 'http://localhost:3000',
          },
        },
        {
          provide: 'UsersService',
          useValue: {
            findByEmail: async () => ({
              id: 'user-id',
              email: 'test@test.com',
            }),
          },
        },
      ],
    }).compile();
    service = module.get<WebauthnService>(WebauthnService);
    repo = module.get<Repository<WebAuthnCredential>>(
      getRepositoryToken(WebAuthnCredential),
    );
  });

  it('should persist advanced fields from registrationInfo', async () => {
    const registrationInfo = {
      credential: {
        id: 'cred-id',
        publicKey: Buffer.from('mock-key'),
        counter: 42,
        transports: ['usb', 'nfc'],
      },
      aaguid: '00000000-0000-0000-0000-000000000000',
      fmt: 'packed',
      credentialDeviceType: 'multiDevice',
      credentialBackedUp: true,
      authenticatorExtensionResults: { credProtect: 2 },
    };
    // Simular response para obtener transports
    const response = { response: { transports: ['usb', 'nfc'] } };
    // Parchear internamente el método verifyRegistration para solo probar la lógica de persistencia
    // @ts-ignore
    await service['persistCredential'](registrationInfo, response, {
      id: 'user-id',
      email: 'test@test.com',
    });
    // Verificar que se llamó a repo.create y repo.save con los campos avanzados
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        credential_id: Buffer.from('cred-id', 'base64url'),
        public_key: Buffer.from('mock-key'),
        sign_count: 42,
        transports: ['usb', 'nfc'],
        aaguid: Buffer.from('00000000000000000000000000000000', 'hex'),
        attestation_fmt: 'packed',
        backup_eligible: true,
        backup_state: 'backed_up',
        cred_protect: '2',
      }),
    );
    expect(repo.save).toHaveBeenCalled();
  });
});
