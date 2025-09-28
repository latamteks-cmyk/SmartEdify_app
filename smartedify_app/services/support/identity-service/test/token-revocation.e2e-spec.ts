
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestConfigurationFactory, TestModuleSetup, TEST_CONSTANTS, TestTimeoutManager } from './utils/test-configuration.factory';
import * as crypto from 'crypto';
import * as jose from 'node-jose';
import { UsersService } from '../src/modules/users/users.service';
import { User } from '../src/modules/users/entities/user.entity';
import { AuthorizationCodeStoreService } from '../src/modules/auth/store/authorization-code-store.service';
import { Repository } from 'typeorm';
import { RefreshToken } from '../src/modules/tokens/entities/refresh-token.entity';

// Helper para crear una prueba DPoP
async function createDpopProof(httpMethod: string, httpUrl: string, signingKey: jose.JWK.Key) {
  const payload = { jti: crypto.randomUUID(), htm: httpMethod, htu: httpUrl, iat: Math.floor(Date.now() / 1000) };
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

describe('Token Revocation (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let refreshTokenRepository: Repository<RefreshToken>;
  let refreshTokenToRevoke: string;

  beforeAll(async () => {
    setup = await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.createTestModule(),
      TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT,
      'Token Revocation test module initialization'
    );
    app = setup.app;
    refreshTokenRepository = setup.refreshTokensRepository;
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await TestConfigurationFactory.cleanDatabase(setup);
  });

  afterAll(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.closeTestModule(setup),
      TEST_CONSTANTS.MAX_CLEANUP_TIME,
      'Token Revocation test module cleanup'
    );
  });

  it('should successfully revoke a valid refresh token', async () => {
    // --- Full flow to get a valid refresh token for this test ---
    await TestConfigurationFactory.cleanDatabase(setup);
    const pkce = generatePkce();
    const dpopKey = await jose.JWK.createKey('EC', 'P-256', { alg: 'ES256', use: 'sig' });

    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    const testUser = await usersService.create({ 
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'revoke-user', 
      email: 'revoke@test.com', 
      password: 'password',
      consent_granted: true
    });

    const authorizeResponse = await request(app.getHttpServer())
      .get('/authorize')
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

    const tokenEndpoint = '/oauth/token';
    const url = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}${tokenEndpoint}`;
    const proof = await createDpopProof('POST', url, dpopKey);

    const tokenResponse = await request(app.getHttpServer())
      .post(tokenEndpoint)
      .set('DPoP', String(proof))
      .send({ grant_type: 'authorization_code', code: authCode, code_verifier: pkce.verifier });
      
    const refreshTokenToRevoke = tokenResponse.body.refresh_token;
    expect(refreshTokenToRevoke).toBeDefined();

    // Verify the token exists before revocation
    const hashedToken = crypto.createHash('sha256').update(refreshTokenToRevoke).digest('hex');
    const tokenInDbBefore = await refreshTokenRepository.findOne({ where: { token_hash: hashedToken } });
    expect(tokenInDbBefore).toBeDefined();

    // Revoke the token
    const response = await request(app.getHttpServer())
      .post('/oauth/revoke')
      .send({ token: refreshTokenToRevoke, token_type_hint: 'refresh_token' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({}); // Body should be empty

    // Verify the token was deleted
    const tokenInDbAfter = await refreshTokenRepository.findOne({ where: { token_hash: hashedToken } });
    expect(tokenInDbAfter).toBeNull();
  });

  it('should return 200 OK even if the token is invalid', async () => {
    const response = await request(app.getHttpServer())
      .post('/oauth/revoke')
      .send({ token: 'invalid-token', token_type_hint: 'refresh_token' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });
});
