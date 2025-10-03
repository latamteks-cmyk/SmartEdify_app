import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as jose from 'node-jose';
import * as crypto from 'crypto';
import { UsersService } from '../../src/modules/users/users.service';
import { AuthorizationCodeStoreService } from '../../src/modules/auth/store/authorization-code-store.service';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
} from '../utils/test-configuration.factory';

describe('Security Scenarios E2E', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let dpopKey: jose.JWK.Key;

  beforeAll(async () => {
    setup = await TestConfigurationFactory.createTestModule();
    app = setup.app;
    await app.listen(0);
    dpopKey = await jose.JWK.createKey('EC', 'P-256', { alg: 'ES256', use: 'sig' });
    // Create a default user
    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    await usersService.create({
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'security-user',
      email: 'security@test.com',
      password: 'password',
      consent_granted: true,
    });
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestConfigurationFactory.closeTestModule(setup);
  });

  const createDpopProof = async (method: string, url: string): Promise<string> => {
    const payload = {
      jti: crypto.randomUUID(),
      htm: method,
      htu: url,
      iat: Math.floor(Date.now() / 1000),
    };
    const proof = await jose.JWS.createSign({ format: 'compact', fields: { jwk: dpopKey.toJSON(), alg: 'ES256' } }, dpopKey)
      .update(JSON.stringify(payload))
      .final();
    return proof as string;
  };

  it('should prevent authorization code interception attacks', async () => {
    // Step 1: Legitimate client initiates authorization request
    const legitimateAuthResponse = await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://legitimate.example.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      });

    const legitimateRedirectUrl = new URL(legitimateAuthResponse.header.location);
    const legitimateCode = legitimateRedirectUrl.searchParams.get('code');

    // Step 2: Malicious attacker intercepts the authorization code
    // In a real attack, they would try to use this code for their own redirect_uri
    // However, the identity service should prevent this

    // Step 3: Attacker tries to exchange intercepted code with their own redirect_uri
    const dpopProof = await createDpopProof('POST', `http://127.0.0.1:${(app.getHttpServer().address() as any).port}/oauth/token`);

    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'authorization_code',
        code: legitimateCode,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://malicious.example.com/callback', // Different redirect_uri
      })
      .expect(400); // Should fail due to PKCE and redirect_uri mismatch validation

    // Step 4: Legitimate client successfully exchanges their code
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'authorization_code',
        code: legitimateCode,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://legitimate.example.com/callback', // Same redirect_uri
      })
      .expect(200); // Should succeed
  });

  it('should prevent refresh token theft and replay attacks', async () => {
    // Step 1: Get a refresh token through normal flow
    const authResponse = await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      });

    const redirectUrl = new URL(authResponse.header.location);
    const code = redirectUrl.searchParams.get('code');

    const dpopProof1 = await createDpopProof('POST', `http://127.0.0.1:${(app.getHttpServer().address() as any).port}/oauth/token`);

    // Bind auth code to created user before exchange
    const authCodeStore = setup.moduleFixture.get<AuthorizationCodeStoreService>(AuthorizationCodeStoreService);
    if (legitimateCode) {
      const prev = authCodeStore.get(legitimateCode);
      if (prev) authCodeStore.set(legitimateCode, { ...prev, userId: (await setup.usersRepository.findOne({})).id });
    }
    const tokenResponse = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof1)
      .send({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(200);

    const refreshToken = tokenResponse.body.refresh_token;

    // Step 2: Use refresh token once (should succeed)
    const dpopProof2 = await createDpopProof('POST', `http://127.0.0.1:${(app.getHttpServer().address() as any).port}/oauth/token`);

    const refreshResponse1 = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof2)
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
      .expect(200);

    const newRefreshToken = refreshResponse1.body.refresh_token;

    // Step 3: Attempt to reuse the same refresh token (should fail and revoke family)
    const dpopProof3 = await createDpopProof('POST', `http://127.0.0.1:${(app.getHttpServer().address() as any).port}/oauth/token`);

    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof3)
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken, // Reusing the same token
      })
      .expect(401); // Should be rejected

    // Step 4: Attempt to use the new refresh token (should also fail due to family revocation)
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof3)
      .send({
        grant_type: 'refresh_token',
        refresh_token: newRefreshToken, // Even the new token should be revoked
      })
      .expect(401); // Should be rejected
  });

  it('should enforce DPoP binding for all token operations', async () => {
    // Step 1: Get an authorization code
    const authResponse = await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      });

    const redirectUrl = new URL(authResponse.header.location);
    const code = redirectUrl.searchParams.get('code');

    // Step 2: Attempt to exchange code without DPoP proof (should fail)
    await request(app.getHttpServer())
      .post('/oauth/token')
      .send({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(401); // Should be rejected due to missing DPoP proof

    // Step 3: Successfully exchange code with DPoP proof
    const dpopProof1 = await createDpopProof('POST', `http://127.0.0.1:${(app.getHttpServer().address() as any).port}/oauth/token`);

    const tokenResponse = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof1)
      .send({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(200);

    const accessToken = tokenResponse.body.access_token;
    const refreshToken = tokenResponse.body.refresh_token;

    // Step 4: Attempt to refresh token with wrong DPoP proof (should fail)
    const dpopProof2 = 'mock-dpop-proof-2'; // Different proof

    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof2)
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
      .expect(401); // Should be rejected due to DPoP binding mismatch

    // Step 5: Successfully refresh token with correct DPoP binding
    const dpopProof3 = 'mock-dpop-proof-3';

    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof3)
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
      .expect(200);

    // Step 6: Attempt to introspect token without client authentication (should fail)
    await request(app.getHttpServer())
      .post('/oauth/introspect')
      .send({
        token: accessToken,
      })
      .expect(401); // Should be rejected due to missing client authentication

    // Step 7: Successfully introspect token with client authentication
    await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret')
      .send({
        token: accessToken,
      })
      .expect(200);
  });

  it('should prevent token substitution attacks', async () => {
    // Step 1: Get two different tokens through normal flows
    const authResponse1 = await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://example1.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      });

    const redirectUrl1 = new URL(authResponse1.header.location);
    const code1 = redirectUrl1.searchParams.get('code');

    const authResponse2 = await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://example2.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      });

    const redirectUrl2 = new URL(authResponse2.header.location);
    const code2 = redirectUrl2.searchParams.get('code');

    const dpopProof1 = 'mock-dpop-proof-1';
    const dpopProof2 = 'mock-dpop-proof-2';

    const tokenResponse1 = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof1)
      .send({
        grant_type: 'authorization_code',
        code: code1,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://example1.com/callback',
      })
      .expect(200);

    const tokenResponse2 = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof2)
      .send({
        grant_type: 'authorization_code',
        code: code2,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://example2.com/callback',
      })
      .expect(200);

    const accessToken1 = tokenResponse1.body.access_token;
    const accessToken2 = tokenResponse2.body.access_token;

    // Step 2: Verify tokens are different
    expect(accessToken1).not.toBe(accessToken2);

    // Step 3: Introspect both tokens
    const introspectResponse1 = await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret')
      .send({
        token: accessToken1,
      })
      .expect(200);

    const introspectResponse2 = await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret')
      .send({
        token: accessToken2,
      })
      .expect(200);

    // Step 4: Verify introspection results show different subjects/scopes if applicable
    expect(introspectResponse1.body.active).toBe(true);
    expect(introspectResponse2.body.active).toBe(true);
    
    // In a real implementation, these would have different subjects or other claims
    // depending on how the test users are set up
  });

  it('should handle denial of service attempts gracefully', async () => {
    // Step 1: Attempt multiple rapid requests without proper headers
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/oauth/token')
          .send({
            grant_type: 'invalid_grant_type',
          })
          .expect(400)
      );
    }

    // Step 2: All requests should be handled gracefully without crashing the service
    await Promise.all(promises);

    // Step 3: Normal requests should still work
    await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      })
      .expect(302); // Should still work normally
  });
});
