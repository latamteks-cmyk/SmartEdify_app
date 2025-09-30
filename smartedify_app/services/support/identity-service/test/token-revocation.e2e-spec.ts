import { INestApplication } from '@nestjs/common';
import request, { Response } from 'supertest';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
} from './utils/test-configuration.factory';
import * as crypto from 'crypto';
import * as jose from 'node-jose';
import { UsersService } from '../src/modules/users/users.service';
import { AuthorizationCodeStoreService } from '../src/modules/auth/store/authorization-code-store.service';
import { Repository } from 'typeorm';
import { RefreshToken } from '../src/modules/tokens/entities/refresh-token.entity';
import { AddressInfo } from 'net';

// Helper para crear una prueba DPoP
async function createDpopProof(
  httpMethod: string,
  httpUrl: string,
  signingKey: jose.JWK.Key,
): Promise<string> {
  const payload = {
    jti: crypto.randomUUID(),
    htm: httpMethod,
    htu: httpUrl,
    iat: Math.floor(Date.now() / 1000),
  };
  const proof = await jose.JWS.createSign(
    { format: 'compact', fields: { jwk: signingKey.toJSON(), alg: 'ES256' } },
    signingKey,
  )
    .update(JSON.stringify(payload))
    .final();
  return proof as string;
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

interface TokenResponseBody {
  refresh_token: string;
}

describe('Token Revocation (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let refreshTokenRepository: Repository<RefreshToken>;

  const getUrl = (endpoint: string): string => {
    const address = app.getHttpServer().address() as AddressInfo;
    if (!address) throw new Error('Server not listening');
    return `http://127.0.0.1:${address.port}${endpoint}`;
  };

  beforeAll(async () => {
    setup = await TestConfigurationFactory.createTestModule();
    app = setup.app;
    refreshTokenRepository = setup.moduleFixture.get('RefreshTokenRepository');
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestConfigurationFactory.closeTestModule(setup);
  });

  it('should successfully revoke a valid refresh token', async () => {
    await TestConfigurationFactory.cleanDatabase(setup);
    const pkce = generatePkce();
    const dpopKey = await jose.JWK.createKey('EC', 'P-256', {
      alg: 'ES256',
      use: 'sig',
    });

    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    const testUser = await usersService.create({
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'revoke-user',
      email: 'revoke@test.com',
      password: 'password',
      consent_granted: true,
    });

    const authorizeResponse = await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
      });

    const locationHeader = authorizeResponse.headers.location;
    const redirectUrl = new URL(locationHeader);
    const authCode = redirectUrl.searchParams.get('code')!;

    const authCodeStore =
      setup.moduleFixture.get<AuthorizationCodeStoreService>(
        AuthorizationCodeStoreService,
      );
    const codeData = authCodeStore.get(authCode);
    if (codeData) {
      authCodeStore.set(authCode, { ...codeData, userId: testUser.id });
    }

    const tokenEndpoint = '/oauth/token';
    const url = getUrl(tokenEndpoint);
    const proof = await createDpopProof('POST', url, dpopKey);

    const tokenResponse: Response = await request(app.getHttpServer())
      .post(tokenEndpoint)
      .set('DPoP', proof)
      .send({
        grant_type: 'authorization_code',
        code: authCode,
        code_verifier: pkce.verifier,
      });

    const { refresh_token } = tokenResponse.body as TokenResponseBody;
    expect(refresh_token).toBeDefined();

    const hashedToken = crypto
      .createHash('sha256')
      .update(refresh_token)
      .digest('hex');
    const tokenInDbBefore = await refreshTokenRepository.findOne({
      where: { token_hash: hashedToken },
    });
    expect(tokenInDbBefore).toBeDefined();

    const response = await request(app.getHttpServer())
      .post('/oauth/revoke')
      .send({ token: refresh_token, token_type_hint: 'refresh_token' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});

    const tokenInDbAfter = await refreshTokenRepository.findOne({
      where: { token_hash: hashedToken },
    });
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
