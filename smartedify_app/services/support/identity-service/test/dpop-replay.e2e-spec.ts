
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestConfigurationFactory, TestModuleSetup, TEST_CONSTANTS, TestTimeoutManager } from './utils/test-configuration.factory';
import * as crypto from 'crypto';
import * as jose from 'node-jose';
import { UsersService } from '../src/modules/users/users.service';
import { User } from '../src/modules/users/entities/user.entity';
import { AuthorizationCodeStoreService } from '../src/modules/auth/store/authorization-code-store.service';

// Helper para crear una prueba DPoP
async function createDpopProof(httpMethod: string, httpUrl: string, signingKey: jose.JWK.Key, jti: string) {
  const payload = { jti, htm: httpMethod, htu: httpUrl, iat: Math.floor(Date.now() / 1000) };
  return jose.JWS.createSign({ format: 'compact', fields: { jwk: signingKey.toJSON(), alg: 'ES256' } }, signingKey)
    .update(JSON.stringify(payload))
    .final();
}

// Helper para PKCE
function generatePkce() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

describe('DPoP Anti-Replay (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;

  beforeAll(async () => {
    setup = await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.createTestModule(),
      TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT,
      'DPoP Anti-Replay test module initialization'
    );
    app = setup.app;
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.closeTestModule(setup),
      TEST_CONSTANTS.MAX_CLEANUP_TIME,
      'DPoP Anti-Replay test module cleanup'
    );
  });

  it('should reject a replayed DPoP proof', async () => {
    // 1. Setup: Go through the full flow to get a valid state
    await TestConfigurationFactory.cleanDatabase(setup);
    const pkce = generatePkce();
    const dpopKey = await jose.JWK.createKey('EC', 'P-256', { alg: 'ES256', use: 'sig' });

    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    const testUser = await usersService.create({ 
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'replay-user', 
      email: 'replay@test.com', 
      password: 'password',
      consent_granted: true
    });

    const authorizeResponse = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .query({ 
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        code_challenge: pkce.challenge, 
        code_challenge_method: 'S256' 
      });
    // Extract code from redirect Location header
    const locationHeader = authorizeResponse.headers.location;
    const redirectUrl = new URL(locationHeader);
    const authCode = redirectUrl.searchParams.get('code')!;

    const authCodeStore = setup.moduleFixture.get<AuthorizationCodeStoreService>(AuthorizationCodeStoreService);
    const codeData = authCodeStore.get(authCode);
    if (codeData) {
      authCodeStore.set(authCode, { ...codeData, userId: testUser.id });
    }

    // 2. Create a single DPoP proof with a specific JTI
    const tokenEndpoint = '/oauth/token';
    const url = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}${tokenEndpoint}`;
    const jti = crypto.randomUUID();
    const proof = await createDpopProof('POST', url, dpopKey, jti);

    // 3. Use the proof for the first time (should succeed)
    const firstResponse = await request(app.getHttpServer())
      .post(tokenEndpoint)
      .set('DPoP', String(proof))
      .send({ grant_type: 'authorization_code', code: authCode, code_verifier: pkce.verifier });
    
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body).toHaveProperty('access_token');

    // 4. Replay the exact same proof (should fail)
    // We need a new auth code for the second attempt
    const secondAuthCodeResponse = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .query({ code_challenge: pkce.challenge, code_challenge_method: 'S256' });
    const secondAuthCode = secondAuthCodeResponse.body.code;
    const secondCodeData = authCodeStore.get(secondAuthCode);
    if (secondCodeData) {
      authCodeStore.set(secondAuthCode, { ...secondCodeData, userId: testUser.id });
    }

    const secondResponse = await request(app.getHttpServer())
      .post(tokenEndpoint)
      .set('DPoP', String(proof)) // Re-using the same proof
      .send({ grant_type: 'authorization_code', code: secondAuthCode, code_verifier: pkce.verifier });

    expect(secondResponse.status).toBe(401);
    expect(secondResponse.body.message).toBe('DPoP proof replay detected');
  });
});
