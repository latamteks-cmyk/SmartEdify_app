
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as jose from 'node-jose';
import * as crypto from 'crypto';
import { TestConfigurationFactory, TestModuleSetup, TEST_CONSTANTS, TestTimeoutManager } from './utils/test-configuration.factory';
import { UsersService } from '../src/modules/users/users.service';
import { User } from '../src/modules/users/entities/user.entity';
import { AuthorizationCodeStoreService } from '../src/modules/auth/store/authorization-code-store.service';

// Helper para crear una prueba DPoP
async function createDpopProof(httpMethod: string, httpUrl: string, signingKey: jose.JWK.Key, customPayload = {}) {
  const payload = {
    jti: crypto.randomUUID(),
    htm: httpMethod,
    htu: httpUrl,
    iat: Math.floor(Date.now() / 1000),
    ...customPayload,
  };

  return jose.JWS.createSign({ format: 'compact', fields: { jwk: signingKey.toJSON(), alg: 'ES256' } }, signingKey)
    .update(JSON.stringify(payload))
    .final();
}

// Helper para PKCE
function generatePkce() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return { verifier, challenge };
}

describe('DPoP Validation (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let testUser: User;
  let dpopKey: jose.JWK.Key;
  let authCode: string;
  let pkce: { verifier: string; challenge: string; };

  beforeAll(async () => {
    setup = await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.createTestModule(),
      TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT,
      'DPoP test module initialization'
    );
    app = setup.app;
    await app.listen(0);
    dpopKey = await jose.JWK.createKey('EC', 'P-256', { alg: 'ES256', use: 'sig' });
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await TestConfigurationFactory.cleanDatabase(setup);
    pkce = generatePkce();

    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    testUser = await usersService.create({ 
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'dpop-user', 
      email: 'dpop@test.com', 
      password: 'password' 
    });

    const authorizeResponse = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .query({ 
        code_challenge: pkce.challenge, 
        code_challenge_method: 'S256',
      });
    authCode = authorizeResponse.body.code;

    const authCodeStore = setup.moduleFixture.get<AuthorizationCodeStoreService>(AuthorizationCodeStoreService);
    const codeData = authCodeStore.get(authCode);
    if (codeData) {
      authCodeStore.set(authCode, { ...codeData, userId: testUser.id });
    }
  });

  afterAll(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.closeTestModule(setup),
      TEST_CONSTANTS.MAX_CLEANUP_TIME,
      'DPoP test module cleanup'
    );
  });

  const tokenEndpoint = '/oauth/token';

  it('should fail with 401 if DPoP header is missing', async () => {
    return request(app.getHttpServer())
      .post(tokenEndpoint)
      .send({
        grant_type: 'authorization_code',
        code: authCode,
        code_verifier: pkce.verifier,
      })
      .expect(401)
      .then(response => {
        expect(response.body.message).toBe('DPoP proof is required');
      });
  });

  it('should fail with 401 for an invalid DPoP signature', async () => {
    const serverAddress = app.getHttpServer().address() as any;
    const url = `http://127.0.0.1:${serverAddress.port}${tokenEndpoint}`;
    const proof = await createDpopProof('POST', url, dpopKey);
    const badProof = String(proof).slice(0, -5) + 'abcde'; // Corromper la firma

    return request(app.getHttpServer())
      .post(tokenEndpoint)
      .set('DPoP', badProof)
      .send({ grant_type: 'authorization_code', code: authCode, code_verifier: pkce.verifier })
      .expect(401)
      .then(response => {
        expect(response.body.message).toBe('Invalid DPoP proof');
      });
  });

  it('should fail with 401 for an invalid htm claim', async () => {
    const serverAddress = app.getHttpServer().address() as any;
    const url = `http://127.0.0.1:${serverAddress.port}${tokenEndpoint}`;
    const proof = await createDpopProof('GET', url, dpopKey); // Metodo incorrecto

    return request(app.getHttpServer())
      .post(tokenEndpoint)
      .set('DPoP', String(proof))
      .send({ grant_type: 'authorization_code', code: authCode, code_verifier: pkce.verifier })
      .expect(401)
      .then(response => {
        expect(response.body.message).toBe('Invalid DPoP htm claim');
      });
  });

  it('should fail with 401 for an invalid htu claim', async () => {
    const proof = await createDpopProof('POST', 'http://wrong.url/token', dpopKey); // URL incorrecta

    return request(app.getHttpServer())
      .post(tokenEndpoint)
      .set('DPoP', String(proof))
      .send({ grant_type: 'authorization_code', code: authCode, code_verifier: pkce.verifier })
      .expect(401)
      .then(response => {
        expect(response.body.message).toBe('Invalid DPoP htu claim');
      });
  });

  it('should succeed with a valid DPoP proof', async () => {
    // Use 127.0.0.1 to match what the server receives internally
    const serverAddress = app.getHttpServer().address() as any;
    const url = `http://127.0.0.1:${serverAddress.port}${tokenEndpoint}`;
    const proof = await createDpopProof('POST', url, dpopKey);

    return request(app.getHttpServer())
      .post(tokenEndpoint)
      .set('DPoP', String(proof))
      .send({ grant_type: 'authorization_code', code: authCode, code_verifier: pkce.verifier })
      .expect(200)
      .then(response => {
        expect(response.body).toHaveProperty('access_token');
        expect(response.body).toHaveProperty('refresh_token');
      });
  });
});
