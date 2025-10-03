import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as jose from 'node-jose';
import * as crypto from 'crypto';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
} from '../utils/test-configuration.factory';
import { UsersService } from '../../src/modules/users/users.service';
import { AuthorizationCodeStoreService } from '../../src/modules/auth/store/authorization-code-store.service';

describe('Multi-Tenant Security (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let dpopKey: jose.JWK.Key;
  let userTenantAId: string;
  let userTenantBId: string;
  const tenantAId = TEST_CONSTANTS.DEFAULT_TENANT_ID;
  const tenantBId = 'b1ffac99-9c0b-4ef8-bb6d-6bb9bd380b22';

  const getUrl = (endpoint: string): string => {
    const address = app.getHttpServer().address() as { port: number };
    if (!address) throw new Error('Server not listening');
    return `http://127.0.0.1:${address.port}${endpoint}`;
  };

  const createDpopProof = async (method: string, url: string): Promise<string> => {
    const payload = {
      jti: crypto.randomUUID(),
      htm: method,
      htu: url,
      iat: Math.floor(Date.now() / 1000),
    };
    const proof = await jose.JWS.createSign(
      { format: 'compact', fields: { jwk: dpopKey.toJSON(), alg: 'ES256' } },
      dpopKey,
    )
      .update(JSON.stringify(payload))
      .final();
    return proof as string;
  };

  const generatePkce = () => {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
  };

  const exchangeCodeForToken = async (
    code: string,
    pkce: { verifier: string },
  ): Promise<string> => {
    const url = getUrl('/oauth/token');
    const proof = await createDpopProof('POST', url);
    const response = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', proof)
      .send({
        grant_type: 'authorization_code',
        code,
        code_verifier: pkce.verifier,
      })
      .expect(200);
    return response.body.access_token as string;
  };

  beforeAll(async () => {
    setup = await TestConfigurationFactory.createTestModule();
    app = setup.app;
    await app.listen(0);
    dpopKey = await jose.JWK.createKey('EC', 'P-256', { alg: 'ES256', use: 'sig' });

    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    const userA = await usersService.create({
      tenant_id: tenantAId,
      username: 'tenantA-user',
      email: 'tenantA@example.com',
      password: 'password',
      consent_granted: true,
    });
    userTenantAId = userA.id;

    const userB = await usersService.create({
      tenant_id: tenantBId,
      username: 'tenantB-user',
      email: 'tenantB@example.com',
      password: 'password',
      consent_granted: true,
    });
    userTenantBId = userB.id;
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestConfigurationFactory.closeTestModule(setup);
  });

  it('issues tenant-scoped tokens and keeps isolation', async () => {
    const authCodeStore = setup.moduleFixture.get<AuthorizationCodeStoreService>(AuthorizationCodeStoreService);

    const flowForTenant = async (tenantId: string, userId: string) => {
      const pkce = generatePkce();
      const authorizeResponse = await request(app.getHttpServer())
        .get('/authorize')
        .query({
          redirect_uri: 'https://example.com/callback',
          scope: 'openid profile',
          code_challenge: pkce.challenge,
          code_challenge_method: 'S256',
        })
        .expect(200);

      const { code } = authorizeResponse.body;
      const stored = authCodeStore.get(code);
      if (stored) {
        authCodeStore.set(code, { ...stored, userId });
      }

      const accessToken = await exchangeCodeForToken(code, pkce);
      const decoded = jose.decodeJwt(accessToken);
      return decoded;
    };

    const tokenA = await flowForTenant(tenantAId, userTenantAId);
    const tokenB = await flowForTenant(tenantBId, userTenantBId);

    expect(tokenA.tenant_id).toBe(tenantAId);
    expect(tokenB.tenant_id).toBe(tenantBId);
    expect(tokenA.tenant_id).not.toBe(tokenB.tenant_id);
  });

  it('exposes tenant-specific JWKS', async () => {
    // Ensure there are active keys for each tenant
    const kms = setup.keyManagementService;
    const keyA = await kms.generateNewKey(tenantAId);
    const keyB = await kms.generateNewKey(tenantBId);

    const jwksA = await request(app.getHttpServer())
      .get('/.well-known/jwks.json')
      .query({ tenant_id: tenantAId })
      .expect(200);
    expect(jwksA.body.keys.some((k: any) => k.kid === keyA.public_key_jwk.kid)).toBe(true);

    const jwksB = await request(app.getHttpServer())
      .get('/.well-known/jwks.json')
      .query({ tenant_id: tenantBId })
      .expect(200);
    expect(jwksB.body.keys.some((k: any) => k.kid === keyB.public_key_jwk.kid)).toBe(true);
  });
});

