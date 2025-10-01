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

// Mocks de Jest para las dependencias WebAuthn
const mockedGenerateRegistrationOptions = jest.fn();
const mockedVerifyRegistrationResponse = jest.fn();
const mockedGenerateAuthenticationOptions = jest.fn();
const mockedVerifyAuthenticationResponse = jest.fn();
// ...existing code...

describe('WebAuthn (e2e)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let credentialsRepository: Repository<WebAuthnCredential>;
  let testUser: User;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Mocks de challenges y respuestas
    let registrationChallenge = 'test-challenge';
    let authenticationChallenge = 'auth-challenge';
    mockedGenerateRegistrationOptions.mockImplementation(() => ({
      challenge: registrationChallenge,
      rp: { name: 'Test App', id: 'localhost' },
      user: { id: 'user-id', name: 'test@example.com', displayName: 'test@example.com' },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      timeout: 60000,
      attestation: 'none',
    }));
    mockedVerifyRegistrationResponse.mockImplementation(({ expectedChallenge }) => ({
      verified: expectedChallenge === 'test-challenge',
      registrationInfo: {
        credentialID: Buffer.from('test-credential-id'),
        credentialPublicKey: Buffer.from('mock-key'),
        counter: 0,
        transports: ['usb'],
        aaguid: '00000000-0000-0000-0000-000000000000',
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      },
    }));
    mockedGenerateAuthenticationOptions.mockImplementation(() => ({
      challenge: authenticationChallenge,
      allowCredentials: [],
      userVerification: 'preferred',
    }));
    mockedVerifyAuthenticationResponse.mockImplementation(() => ({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    }));

    // ...setup del módulo igual que antes...
    const { TypeOrmModule } = require('@nestjs/typeorm');
    const { getTestDatabaseConfig } = require('../src/config/database.config');
    const { WebauthnService } = require('../src/modules/webauthn/webauthn.service');
    const { getRepositoryToken } = require('@nestjs/typeorm');
    const { WebAuthnCredential } = require('../src/modules/webauthn/entities/webauthn-credential.entity');
    const { UsersService } = require('../src/modules/users/users.service');
    const { User } = require('../src/modules/users/entities/user.entity');
    const { RpService } = require('../src/modules/webauthn/rp.service');
    const { TestingModule, Test } = require('@nestjs/testing');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(getTestDatabaseConfig()),
        require('../src/modules/webauthn/webauthn.module').WebauthnModule,
        require('../src/modules/users/users.module').UsersModule,
      ],
    })
      .overrideProvider(WebauthnService)
      .useFactory({
        factory: (
          rpService: typeof RpService,
          usersService: typeof UsersService,
          webAuthnCredentialRepository: any,
        ) =>
          new WebauthnService(
            rpService,
            usersService,
            webAuthnCredentialRepository,
            mockedGenerateRegistrationOptions,
            mockedVerifyRegistrationResponse,
            mockedGenerateAuthenticationOptions,
            mockedVerifyAuthenticationResponse,
          ),
        inject: [RpService, UsersService, getRepositoryToken(WebAuthnCredential)],
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    usersRepository = moduleFixture.get(getRepositoryToken(User));
    credentialsRepository = moduleFixture.get(getRepositoryToken(WebAuthnCredential));
    const usersService = moduleFixture.get(UsersService);

    testUser = await usersService.create({
      tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpass',
      status: 'ACTIVE',
      consent_granted: true,
      policy_version: 'v1',
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
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
      mockedVerifyRegistrationResponse.mockImplementation(({ expectedChallenge }) => ({
        verified: expectedChallenge === 'test-challenge',
        registrationInfo: {
          credentialID: Buffer.from('test-credential-id'),
          credentialPublicKey: Buffer.from('mock-key'),
          counter: 0,
          transports: ['usb'],
          aaguid: '00000000-0000-0000-0000-000000000000',
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
        },
      }));


      // Ensure challenge is set in the challenge store by calling registration/options first
      await request(app.getHttpServer())
        .get('/webauthn/registration/options')
        .query({ username: testUser.email })
        .expect(200);

      const registrationChallenge = 'test-challenge';
      const credential = {
        id: 'test-credential-id',
        rawId: 'test-credential-id',
        response: {
          attestationObject: 'mock-attestation',
          clientDataJSON: 'mock-client-data',
        },
        type: 'public-key',
      };
      const response = await request(app.getHttpServer())
        .post('/webauthn/registration/verification')
        .set('webauthn-challenge', registrationChallenge)
        .send({ ...credential, userId: testUser.id })
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
  const { WebauthnService } = require('../src/modules/webauthn/webauthn.service');
  const webAuthnService = app.get(WebauthnService);

      const registrationInfo = {
        credentialID: Buffer.from('test-cred-id'),
        credentialPublicKey: Buffer.from('mock-key'),
        counter: 1,
        transports: ['usb', 'nfc'],
        aaguid: '00000000-0000-0000-0000-000000000000',
        credentialDeviceType: 'multiDevice',
        credentialBackedUp: true,
      };
      // Mock mínimo válido para RegistrationResponseJSON

      const mockResponse = {
        id: 'test-cred-id',
        rawId: 'test-cred-id',
        response: {
          clientDataJSON: 'mock-client-data',
          attestationObject: 'mock-attestation',
          transports: ['usb', 'nfc'] as import('@simplewebauthn/types').AuthenticatorTransportFuture[],
        },
        clientExtensionResults: {},
        type: 'public-key' as const,
      };

      await webAuthnService['persistCredential'](
        registrationInfo,
        mockResponse,
        testUser,
      );

      const creds = await credentialsRepository.find();
      expect(creds.length).toBe(1);
      const cred = creds[0];
    expect(cred.transports).toEqual(['usb', 'nfc']);
    expect(cred.cred_protect).toBeNull(); // credProtect es null en persistencia real
    expect(cred.backup_eligible).toBe(true);
    expect(cred.backup_state).toBe('backed_up');
    // aaguid se persiste como Buffer, comparar como hex string (16 bytes = 32 hex chars)
    expect(Buffer.isBuffer(cred.aaguid) ? cred.aaguid.toString('hex') : cred.aaguid).toBe('00000000000000000000000000000000');
    expect(cred.attestation_fmt).toBeNull(); // fmt es null en persistencia real
    });
  });
});
