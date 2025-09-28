import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as jose from 'node-jose';
import * as crypto from 'crypto';
import { TestConfigurationFactory, TestModuleSetup, TEST_CONSTANTS } from './utils/test-configuration.factory';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { KafkaService } from '../src/modules/kafka/kafka.service';
import { ClientStoreService } from '../src/modules/clients/client-store.service';
import { SessionsService } from '../src/modules/sessions/sessions.service';
import { Session } from '../src/modules/sessions/entities/session.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from '../src/modules/users/users.service';

describe('Back-Channel Logout (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let clientKey: jose.JWK.Key;
  let sessionsService: SessionsService;
  let sessionRepository: Repository<Session>;
  const clientId = 'test-client-for-jwt-auth';
  const keyId = 'test-key-1';

  beforeAll(async () => {
    const mockKafkaService = { publish: jest.fn().mockResolvedValue(undefined) };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(KafkaService)
    .useValue(mockKafkaService)
    .compile();

    app = moduleFixture.createNestApplication();
    sessionsService = app.get<SessionsService>(SessionsService);
    sessionRepository = app.get<Repository<Session>>(getRepositoryToken(Session));
    await app.init();
    await app.listen(0);

    const keyStore = jose.JWK.createKeyStore();
    clientKey = await keyStore.generate('EC', 'P-256', { alg: 'ES256', use: 'sig' });
    const publicJwk = clientKey.toJSON(false);

    const clientStoreService = app.get<ClientStoreService>(ClientStoreService);
    const originalFindMethod = clientStoreService.findClientById.bind(clientStoreService);
    clientStoreService.findClientById = async (id: string) => {
      if (id === clientId) {
        return {
          client_id: clientId,
          jwks: { keys: [{ ...publicJwk, kid: keyId }] },
        };
      }
      return originalFindMethod(id);
    };

    setup = { app, moduleFixture } as TestModuleSetup;
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestConfigurationFactory.closeTestModule(setup);
  });

  async function createLogoutToken(payload: object) {
    const finalPayload = JSON.stringify({
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      ...payload,
    });
    const options = { format: 'compact' as const, fields: { kid: keyId } };
    return jose.JWS.createSign(options, clientKey).update(finalPayload).final();
  }

  it('should revoke a session with a valid logout_token', async () => {
    // 1. Create a user and a session directly in the database
    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    const testUser = await usersService.create({
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'backchannel-user',
      email: 'backchannel@test.com',
      password: 'password',
      consent_granted: true,
    });

    const newSession = sessionRepository.create({
        user: testUser,
        tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
        device_id: 'test-device',
        cnf_jkt: 'some-jkt',
        not_after: new Date(Date.now() + 1000 * 60 * 60),
    });
    const savedSession = await sessionRepository.save(newSession);

    // 2. Create a valid logout_token
    const logoutToken = await createLogoutToken({
      iss: clientId,
      sub: testUser.id,
      aud: `https://auth.smartedify.global/t/${TEST_CONSTANTS.DEFAULT_TENANT_ID}`,
      events: { 'http://schemas.openid.net/event/backchannel-logout': {} },
      sid: savedSession.id,
    });

    // 3. Send the back-channel logout request
    await request(app.getHttpServer())
      .post('/backchannel-logout')
      .send({ logout_token: logoutToken })
      .expect(200);

    // 4. Verify the session is revoked
    const revokedSession = await sessionRepository.findOne({ where: { id: savedSession.id } });
    expect(revokedSession.revoked_at).not.toBeNull();
  });
});