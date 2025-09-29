import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Repository } from 'typeorm';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
  TestTimeoutManager,
} from './utils/test-configuration.factory';
import { UsersService } from '../src/modules/users/users.service';
import { User } from '../src/modules/users/entities/user.entity';
import { WebAuthnCredential } from '../src/modules/webauthn/entities/webauthn-credential.entity';

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

describe('WebAuthn (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let usersService: UsersService;
  let testUser: User;
  let credentialsRepository: Repository<WebAuthnCredential>;

  beforeAll(async () => {
    setup = await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.createTestModule(),
      TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT,
      'WebAuthn test module initialization'
    );
    app = setup.app;
    usersService = setup.usersService;
    credentialsRepository = setup.webAuthnCredentialsRepository;
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    jest.resetAllMocks();
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.cleanDatabase(setup),
      TEST_CONSTANTS.DATABASE_OPERATION_TIMEOUT,
      'Database cleanup'
    );

    testUser = await usersService.create({
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'webauthn-user',
      email: 'webauthn@test.com',
      password: 'password',
      consent_granted: true,
    });
  });

  afterAll(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.closeTestModule(setup),
      TEST_CONSTANTS.MAX_CLEANUP_TIME,
      'Test module cleanup'
    );
  });

  describe('Options Generation', () => {
    it('should return valid registration options', async () => {
      const expectedChallenge = 'registration-challenge';
      (generateRegistrationOptions as jest.Mock).mockResolvedValue({
        challenge: expectedChallenge,
        rp: { name: 'SmartEdify', id: 'smartedify.local' },
        user: {
          id: Buffer.from(testUser.id).toString('base64url'),
          name: testUser.email,
          displayName: testUser.email,
        },
        pubKeyCredParams: [],
      });

      const response = await request(app.getHttpServer())
        .get('/webauthn/registration/options')
        .query({ username: testUser.email, userId: testUser.id });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.rp).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.challenge).toBeDefined();
      expect(response.body.pubKeyCredParams).toBeDefined();
      expect(response.body.user.id).toBe(Buffer.from(testUser.id).toString('base64url'));
    });

    it('should return valid authentication options', async () => {
      (generateRegistrationOptions as jest.Mock).mockResolvedValue({
        challenge: 'registration-challenge',
        rp: { name: 'SmartEdify', id: 'smartedify.local' },
        user: {
          id: Buffer.from(testUser.id).toString('base64url'),
          name: testUser.email,
          displayName: testUser.email,
        },
        pubKeyCredParams: [],
      });
      const expectedChallenge = 'authentication-challenge';
      (generateAuthenticationOptions as jest.Mock).mockResolvedValue({
        challenge: expectedChallenge,
        allowCredentials: [],
      });

      await request(app.getHttpServer())
        .get('/webauthn/registration/options')
        .query({ username: testUser.email, userId: testUser.id });

      const response = await request(app.getHttpServer())
        .get('/webauthn/authentication/options')
        .query({ username: testUser.email });

      expect(response.status).toBe(200);
      expect(response.body.challenge).toBe(expectedChallenge);
    });
  });

  describe('Verification', () => {
    it('should verify registration with stored challenge and persist credential', async () => {
      const registrationChallenge = 'registration-challenge';
      const credentialId = Buffer.from('credential-id');

      (generateRegistrationOptions as jest.Mock).mockResolvedValue({
        challenge: registrationChallenge,
        rp: { name: 'SmartEdify', id: 'smartedify.local' },
        user: {
          id: Buffer.from(testUser.id).toString('base64url'),
          name: testUser.email,
          displayName: testUser.email,
        },
        pubKeyCredParams: [],
      });

      (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credentialPublicKey: Buffer.from('public-key'),
          credentialID: credentialId,
          counter: 1,
        },
      });

      await request(app.getHttpServer())
        .get('/webauthn/registration/options')
        .query({ username: testUser.email });

      const webauthnResponse = {
        id: credentialId.toString('base64url'),
        rawId: credentialId.toString('base64url'),
        response: {},
        type: 'public-key',
        clientExtensionResults: {},
        authenticatorAttachment: 'cross-platform',
        userId: testUser.id,
      };

      const verificationResponse = await request(app.getHttpServer())
        .post('/webauthn/registration/verification')
        .set('webauthn-challenge', registrationChallenge)
        .send(webauthnResponse);

      expect(verificationResponse.status).toBe(201);
      expect(verifyRegistrationResponse).toHaveBeenCalledWith(
        expect.objectContaining({ expectedChallenge: registrationChallenge })
      );

      const credentials = await credentialsRepository.find({
        where: { user: { id: testUser.id } },
        relations: ['user'],
      });
      expect(credentials).toHaveLength(1);
      expect(credentials[0].user.id).toBe(testUser.id);
    });

    it('should reject registration verification when challenge is reused', async () => {
      const registrationChallenge = 'registration-challenge';
      const credentialId = Buffer.from('credential-id');

      (generateRegistrationOptions as jest.Mock).mockResolvedValue({
        challenge: registrationChallenge,
        rp: { name: 'SmartEdify', id: 'smartedify.local' },
        user: {
          id: Buffer.from(testUser.id).toString('base64url'),
          name: testUser.email,
          displayName: testUser.email,
        },
        pubKeyCredParams: [],
      });

      (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credentialPublicKey: Buffer.from('public-key'),
          credentialID: credentialId,
          counter: 1,
        },
      });

      await request(app.getHttpServer())
        .get('/webauthn/registration/options')
        .query({ username: testUser.email });

      const payload = {
        id: credentialId.toString('base64url'),
        rawId: credentialId.toString('base64url'),
        response: {},
        type: 'public-key',
        clientExtensionResults: {},
        authenticatorAttachment: 'cross-platform',
        userId: testUser.id,
      };

      const firstAttempt = await request(app.getHttpServer())
        .post('/webauthn/registration/verification')
        .set('webauthn-challenge', registrationChallenge)
        .send(payload);
      expect(firstAttempt.status).toBe(201);

      const secondAttempt = await request(app.getHttpServer())
        .post('/webauthn/registration/verification')
        .set('webauthn-challenge', registrationChallenge)
        .send(payload);

      expect(secondAttempt.status).toBe(400);
      expect(verifyRegistrationResponse).toHaveBeenCalledTimes(1);
    });

    it('should verify authentication using stored challenge and credential', async () => {
      const registrationChallenge = 'registration-challenge';
      const authenticationChallenge = 'authentication-challenge';
      const credentialId = Buffer.from('credential-id');

      (generateRegistrationOptions as jest.Mock).mockResolvedValue({
        challenge: registrationChallenge,
        rp: { name: 'SmartEdify', id: 'smartedify.local' },
        user: {
          id: Buffer.from(testUser.id).toString('base64url'),
          name: testUser.email,
          displayName: testUser.email,
        },
        pubKeyCredParams: [],
      });

      (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credentialPublicKey: Buffer.from('public-key'),
          credentialID: credentialId,
          counter: 1,
        },
      });

      (generateAuthenticationOptions as jest.Mock).mockResolvedValue({
        challenge: authenticationChallenge,
        allowCredentials: [
          {
            id: credentialId.toString('base64url'),
            type: 'public-key',
          },
        ],
      });

      (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 2 },
      });

      await request(app.getHttpServer())
        .get('/webauthn/registration/options')
        .query({ username: testUser.email });

      await request(app.getHttpServer())
        .post('/webauthn/registration/verification')
        .set('webauthn-challenge', registrationChallenge)
        .send({
          id: credentialId.toString('base64url'),
          rawId: credentialId.toString('base64url'),
          response: {},
          type: 'public-key',
          clientExtensionResults: {},
          authenticatorAttachment: 'cross-platform',
          userId: testUser.id,
        });

      await request(app.getHttpServer())
        .get('/webauthn/authentication/options')
        .query({ username: testUser.email });

      const authResponse = await request(app.getHttpServer())
        .post('/webauthn/authentication/verification')
        .set('webauthn-challenge', authenticationChallenge)
        .send({
          credentialID: credentialId.toString('base64url'),
          response: {},
          type: 'public-key',
        });

      expect(authResponse.status).toBe(201);
      expect(verifyAuthenticationResponse).toHaveBeenCalledWith(
        expect.objectContaining({ expectedChallenge: authenticationChallenge })
      );

      const storedCredential = await credentialsRepository.findOne({
        where: { user: { id: testUser.id } },
        relations: ['user'],
      });
      expect(storedCredential?.sign_count).toBe(2);
      expect(storedCredential?.last_used_at).toBeInstanceOf(Date);
    });

    it('should reject authentication when challenge is reused', async () => {
      const registrationChallenge = 'registration-challenge';
      const authenticationChallenge = 'authentication-challenge';
      const credentialId = Buffer.from('credential-id');

      (generateRegistrationOptions as jest.Mock).mockResolvedValue({
        challenge: registrationChallenge,
        rp: { name: 'SmartEdify', id: 'smartedify.local' },
        user: {
          id: Buffer.from(testUser.id).toString('base64url'),
          name: testUser.email,
          displayName: testUser.email,
        },
        pubKeyCredParams: [],
      });

      (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credentialPublicKey: Buffer.from('public-key'),
          credentialID: credentialId,
          counter: 1,
        },
      });

      (generateAuthenticationOptions as jest.Mock).mockResolvedValue({
        challenge: authenticationChallenge,
        allowCredentials: [{ id: credentialId.toString('base64url'), type: 'public-key' }],
      });

      (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 2 },
      });

      await request(app.getHttpServer())
        .get('/webauthn/registration/options')
        .query({ username: testUser.email });

      await request(app.getHttpServer())
        .post('/webauthn/registration/verification')
        .set('webauthn-challenge', registrationChallenge)
        .send({
          id: credentialId.toString('base64url'),
          rawId: credentialId.toString('base64url'),
          response: {},
          type: 'public-key',
          clientExtensionResults: {},
          authenticatorAttachment: 'cross-platform',
          userId: testUser.id,
        });

      await request(app.getHttpServer())
        .get('/webauthn/authentication/options')
        .query({ username: testUser.email });

      const firstAttempt = await request(app.getHttpServer())
        .post('/webauthn/authentication/verification')
        .set('webauthn-challenge', authenticationChallenge)
        .send({
          credentialID: credentialId.toString('base64url'),
          response: {},
          type: 'public-key',
        });
      expect(firstAttempt.status).toBe(201);

      const secondAttempt = await request(app.getHttpServer())
        .post('/webauthn/authentication/verification')
        .set('webauthn-challenge', authenticationChallenge)
        .send({
          credentialID: credentialId.toString('base64url'),
          response: {},
          type: 'public-key',
        });

      expect(secondAttempt.status).toBe(400);
      expect(verifyAuthenticationResponse).toHaveBeenCalledTimes(1);
    });
  });

  describe('WebAuthn L3 Advanced Fields', () => {
    it('should persist advanced fields on registration', async () => {
      // usar método privado para persistir directamente
      const { WebauthnService } = require('../src/modules/webauthn/webauthn.service');
      const webAuthnService = setup.moduleFixture.get(WebauthnService);

      const registrationInfo = {
        credentialID: Buffer.from('test-cred-id'),
        credentialPublicKey: Buffer.from('mock-key'),
        counter: 1,
        transports: ['usb', 'nfc'],
        aaguid: '00000000-0000-0000-0000-000000000000',
        fmt: 'packed',
        credentialDeviceType: 'multiDevice',
        credentialBackedUp: true,
        authenticatorExtensionResults: { credProtect: 2 },
      };
      const response = { response: { transports: ['usb', 'nfc'] } };

      // @ts-ignore acceso intencional
      await webAuthnService['persistCredential'](registrationInfo, response, testUser);

      const creds = await credentialsRepository.find();
      expect(creds.length).toBe(1);
      const cred = creds[0];
      expect(cred.transports).toContain('usb');
      expect(cred.transports).toContain('nfc');
      expect(cred.cred_protect).toBe('2');
      expect(cred.backup_eligible).toBe(true);
      expect(cred.backup_state).toBe('backed_up');
      expect(cred.aaguid?.toString('hex')).toBe('00000000000000000000000000000000');
      expect(cred.attestation_fmt).toBe('packed');
    });
  });
});
