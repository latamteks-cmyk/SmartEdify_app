import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
} from './utils/test-configuration.factory';
import * as crypto from 'crypto';
import * as jose from 'node-jose';
import { UsersService } from '../src/modules/users/users.service';
import { AuthorizationCodeStoreService } from '../src/modules/auth/store/authorization-code-store.service';
import { DpopReplayProof } from '../src/modules/auth/entities/dpop-replay-proof.entity';
import { JtiStoreService } from '../src/modules/auth/store/jti-store.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddressInfo } from 'net';

// Helper para crear una prueba DPoP
interface CreateDpopProofOptions {
  jti?: string;
  iat?: number;
}

async function createDpopProof(
  httpMethod: string,
  httpUrl: string,
  signingKey: jose.JWK.Key,
  options: CreateDpopProofOptions = {},
): Promise<{ proof: string; jti: string; iat: number }> {
  const payload = {
    jti: options.jti ?? crypto.randomUUID(),
    htm: httpMethod,
    htu: httpUrl,
    iat: options.iat ?? Math.floor(Date.now() / 1000),
  };

  const proof = await jose.JWS.createSign(
    { format: 'compact', fields: { jwk: signingKey.toJSON(), alg: 'ES256' } },
    signingKey,
  )
    .update(JSON.stringify(payload))
    .final();

  return { proof: proof as string, jti: payload.jti, iat: payload.iat };
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

describe('DPoP Anti-Replay (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;

  const getUrl = (endpoint: string): string => {
    const address = app.getHttpServer().address() as AddressInfo;
    if (!address) {
      throw new Error('Server not listening');
    }
    return `http://127.0.0.1:${address.port}${endpoint}`;
  };

  beforeAll(async () => {
    setup = await TestConfigurationFactory.createTestModule();
    app = setup.app;
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestConfigurationFactory.closeTestModule(setup);
  });

  it('should reject a replayed DPoP proof', async () => {
    await TestConfigurationFactory.cleanDatabase(setup);
    const pkce = generatePkce();
    const dpopKey = await jose.JWK.createKey('EC', 'P-256', {
      alg: 'ES256',
      use: 'sig',
    });

    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    const testUser = await usersService.create({
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'replay-user',
      email: 'replay@test.com',
      password: 'password',
      consent_granted: true,
    });

    const authCodeStore =
      setup.moduleFixture.get<AuthorizationCodeStoreService>(
        AuthorizationCodeStoreService,
      );

    const getAuthCode = async () => {
      const response = await request(app.getHttpServer())
        .get('/authorize')
        .query({
          redirect_uri: 'https://example.com/callback',
          scope: 'openid profile',
          code_challenge: pkce.challenge,
          code_challenge_method: 'S256',
        });
      const locationHeader = response.headers.location;
      const redirectUrl = new URL(locationHeader);
      const code = redirectUrl.searchParams.get('code')!;
      const codeData = authCodeStore.get(code);
      if (codeData) {
        authCodeStore.set(code, { ...codeData, userId: testUser.id });
      }
      return code;
    };

    const tokenEndpoint = '/oauth/token';
    const url = getUrl(tokenEndpoint);
    const jti = crypto.randomUUID();
    const { proof } = await createDpopProof('POST', url, dpopKey, { jti });

    const firstAuthCode = await getAuthCode();
    const firstResponse = await request(app.getHttpServer())
      .post(tokenEndpoint)
      .set('DPoP', proof)
      .send({
        grant_type: 'authorization_code',
        code: firstAuthCode,
        code_verifier: pkce.verifier,
      });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body).toHaveProperty('access_token');

    const secondAuthCode = await getAuthCode();
    const secondResponse = await request(app.getHttpServer())
      .post(tokenEndpoint)
      .set('DPoP', proof) // Re-using the same proof
      .send({
        grant_type: 'authorization_code',
        code: secondAuthCode,
        code_verifier: pkce.verifier,
      });

    expect(secondResponse.status).toBe(401);
    expect(secondResponse.body.message).toBe('DPoP proof replay detected');
  });

  it('should reject a DPoP proof with an expired iat claim', async () => {
    await TestConfigurationFactory.cleanDatabase(setup);
    const pkce = generatePkce();
    const dpopKey = await jose.JWK.createKey('EC', 'P-256', {
      alg: 'ES256',
      use: 'sig',
    });

    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    const testUser = await usersService.create({
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'expired-iat-user',
      email: 'expired-iat@test.com',
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
    if (!locationHeader) {
      throw new Error('No redirect location in authorize response');
    }
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
    const oldIat = Math.floor(Date.now() / 1000) - 60;
    const { proof } = await createDpopProof('POST', url, dpopKey, {
      iat: oldIat,
    });

    const response = await request(app.getHttpServer())
      .post(tokenEndpoint)
      .set('DPoP', proof)
      .send({
        grant_type: 'authorization_code',
        code: authCode,
        code_verifier: pkce.verifier,
      });

    expect(response.status).toBe(401);
    expect(response.body.detail).toBe('DPoP proof expired');
  });

  it('should prevent replay across different nodes using the shared backend', async () => {
    await TestConfigurationFactory.cleanDatabase(setup);
    const pkce = generatePkce();
    const dpopKey = await jose.JWK.createKey('EC', 'P-256', {
      alg: 'ES256',
      use: 'sig',
    });

    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    const testUser = await usersService.create({
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'multi-node-user',
      email: 'multi-node@test.com',
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
    if (!locationHeader) {
      throw new Error('No redirect location in authorize response');
    }
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
    const replayJti = crypto.randomUUID();
    const { proof, jti, iat } = await createDpopProof('POST', url, dpopKey, {
      jti: replayJti,
    });

    const firstResponse = await request(app.getHttpServer())
      .post(tokenEndpoint)
      .set('DPoP', proof)
      .send({
        grant_type: 'authorization_code',
        code: authCode,
        code_verifier: pkce.verifier,
      });

    expect(firstResponse.status).toBe(200);

    const thumbprint = Buffer.from(
      await dpopKey.thumbprint('SHA-256'),
    ).toString('hex');
    const repository = setup.moduleFixture.get<Repository<DpopReplayProof>>(
      getRepositoryToken(DpopReplayProof),
    );
    const secondaryStore = new JtiStoreService(repository);

    await expect(
      secondaryStore.register({
        tenantId: testUser.tenant_id,
        jkt: thumbprint,
        jti,
        iat,
      }),
    ).rejects.toThrow('DPoP proof replay detected');
  });
});
