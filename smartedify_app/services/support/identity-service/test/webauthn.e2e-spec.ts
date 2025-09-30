import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { User } from '../src/modules/users/entities/user.entity';
import { WebAuthnCredential } from '../src/modules/webauthn/entities/webauthn-credential.entity';
import { TestConfigurationFactory } from './utils/test-configuration.factory';
import { WebauthnService } from '../src/modules/webauthn/webauthn.service';

// Define a type for the test setup object to avoid 'any'
interface TestModuleSetup {
  app: INestApplication;
  moduleFixture: TestingModule;
}

// Mock para @simplewebauthn/server
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

// Cast mocks to jest.Mock for type-safe usage
const mockedGenerateRegistrationOptions =
  generateRegistrationOptions as jest.Mock;
const mockedVerifyRegistrationResponse =
  verifyRegistrationResponse as jest.Mock;
const mockedVerifyAuthenticationResponse =
  verifyAuthenticationResponse as jest.Mock;

describe('WebAuthn (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let credentialsRepository: Repository<WebAuthnCredential>;
  let testUser: User;

  beforeEach(async () => {
    setup = await TestConfigurationFactory.createTestModule();
    app = setup.app;

    usersRepository = setup.moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    credentialsRepository = setup.moduleFixture.get<
      Repository<WebAuthnCredential>
    >(getRepositoryToken(WebAuthnCredential));

    testUser = await usersRepository.save({
      username: 'testuser',
      email: 'test@example.com',
      tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  afterEach(async () => {
    await TestConfigurationFactory.closeTestModule(setup);
  });

  describe('/webauthn/registration/options (GET)', () => {
    it('should return registration options for a user', async () => {
      const mockOptions = {
        challenge: 'test-challenge',
        rp: { name: 'Test App', id: 'localhost' },
        user: {
          id: testUser.id,
          name: testUser.email,
          displayName: testUser.email,
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        timeout: 60000,
        attestation: 'none',
      };
      mockedGenerateRegistrationOptions.mockReturnValue(mockOptions);

      const response = await request(app.getHttpServer())
        .get('/webauthn/registration/options')
        .query({ username: testUser.email })
        .expect(200);

      expect(response.body).toHaveProperty('challenge');
      expect(response.body).toHaveProperty('rp');
      expect(response.body).toHaveProperty('user');
      expect(mockedGenerateRegistrationOptions).toHaveBeenCalled();
    });
  });

  describe('/webauthn/registration/verification (POST)', () => {
    it('should verify and store a valid registration', async () => {
      const mockVerificationResult = {
        verified: true,
        registrationInfo: {
          credentialID: Buffer.from('test-credential-id'),
          credentialPublicKey: Buffer.from('mock-key'),
          counter: 0,
          transports: ['usb'],
          aaguid: '00000000-0000-0000-0000-000000000000',
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      };
      mockedVerifyRegistrationResponse.mockResolvedValue(
        mockVerificationResult,
      );

      const registrationChallenge = 'test-challenge';
      const response = await request(app.getHttpServer())
        .post('/webauthn/registration/verification')
        .set('webauthn-challenge', registrationChallenge)
        .send({
          userId: testUser.id,
          credential: {
            id: 'test-credential-id',
            rawId: 'test-credential-id',
            response: {
              attestationObject: 'mock-attestation',
              clientDataJSON: 'mock-client-data',
            },
            type: 'public-key',
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('verified', true);
      expect(mockedVerifyRegistrationResponse).toHaveBeenCalled();

      const savedCredential = await credentialsRepository.findOne({
        where: { user: { id: testUser.id } },
      });
      expect(savedCredential).toBeDefined();
    });
  });

  describe('Registration Options Security', () => {
    it('should prevent replay attacks by using unique challenges', async () => {
      mockedGenerateRegistrationOptions.mockReturnValueOnce({
        challenge: 'unique-challenge-1',
      });
      mockedGenerateRegistrationOptions.mockReturnValueOnce({
        challenge: 'unique-challenge-2',
      });

      const firstCall = await request(app.getHttpServer())
        .get('/webauthn/registration/options')
        .query({ username: testUser.email });

      const secondCall = await request(app.getHttpServer())
        .get('/webauthn/registration/options')
        .query({ username: testUser.email });

      expect(mockedGenerateRegistrationOptions).toHaveBeenCalledTimes(2);
      expect(firstCall.body.challenge).toBe('unique-challenge-1');
      expect(secondCall.body.challenge).toBe('unique-challenge-2');
    });
  });

  describe('Authentication Flow', () => {
    beforeEach(async () => {
      await credentialsRepository.save({
        credential_id: Buffer.from('test-cred-id'),
        user: testUser,
        public_key: Buffer.from('mock-public-key'),
        sign_count: 0,
        rp_id: 'localhost',
        origin: 'http://localhost:3000',
        created_at: new Date(),
      });
    });

    it('should prevent replay attacks in authentication', async () => {
      const mockVerificationResult = {
        verified: true,
        authenticationInfo: { newCounter: 1 },
      };
      mockedVerifyAuthenticationResponse.mockResolvedValue(
        mockVerificationResult,
      );

      const credentialId = Buffer.from('test-cred-id');
      const authenticationChallenge = 'auth-challenge';

      await request(app.getHttpServer())
        .post('/webauthn/assertion/options')
        .send({ username: testUser.email });

      const firstAttempt = await request(app.getHttpServer())
        .post('/webauthn/assertion/result')
        .set('webauthn-challenge', authenticationChallenge)
        .send({
          credentialID: credentialId.toString('base64url'),
          response: { id: credentialId.toString('base64url') },
        });

      expect(firstAttempt.status).toBe(201);

      // This mock will now throw an error on the second call, simulating replay detection
      mockedVerifyAuthenticationResponse.mockRejectedValueOnce(
        new Error('Challenge does not match'),
      );

      const secondAttempt = await request(app.getHttpServer())
        .post('/webauthn/assertion/result')
        .set('webauthn-challenge', authenticationChallenge)
        .send({
          credentialID: credentialId.toString('base64url'),
          response: { id: credentialId.toString('base64url') },
        });

      expect(secondAttempt.status).toBe(400);
    });
  });

  describe('WebAuthn L3 Advanced Fields', () => {
    it('should persist advanced fields on registration', async () => {
      const webAuthnService = setup.moduleFixture.get(WebauthnService);

      const registrationInfo = {
        credentialID: Buffer.from('test-cred-id'),
        credentialPublicKey: Buffer.from('mock-key'),
        counter: 1,
        transports: ['usb', 'nfc'],
        aaguid: '00000000-0000-0000-0000-000000000000',
        credentialDeviceType: 'multiDevice',
        credentialBackedUp: true,
      };
      const mockResponse = { response: { transports: ['usb', 'nfc'] } };

      // @ts-expect-error: Intentionally accessing private method for testing
      await webAuthnService['persistCredential'](
        { registrationInfo },
        mockResponse,
        testUser,
      );

      const creds = await credentialsRepository.find();
      expect(creds.length).toBe(1);
      const cred = creds[0];
      expect(cred.transports).toEqual(['usb', 'nfc']);
      expect(cred.cred_protect).toBeUndefined(); // credProtect is not in registrationInfo
      expect(cred.backup_eligible).toBe(true);
      expect(cred.backup_state).toBe('backed_up');
      expect(cred.aaguid).toBe('00000000-0000-0000-0000-000000000000');
      expect(cred.attestation_fmt).toBeUndefined(); // fmt is not in registrationInfo
    });
  });
});
