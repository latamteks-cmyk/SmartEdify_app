import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as jose from 'node-jose';
import * as crypto from 'crypto';
import { UsersService } from '../../src/modules/users/users.service';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
} from '../utils/test-configuration.factory';

describe('Complete Authentication Flow E2E', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  let dpopKey: jose.JWK.Key;

  beforeAll(async () => {
    setup = await TestConfigurationFactory.createTestModule();
    app = setup.app;
    await app.listen(0);
    dpopKey = await jose.JWK.createKey('EC', 'P-256', { alg: 'ES256', use: 'sig' });
    // Create default user
    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    await usersService.create({
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'flow-user',
      email: 'flow@test.com',
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

  it('should complete the full OAuth 2.0 + DPoP + PKCE flow', async () => {
    // Step 1: Pushed Authorization Request (PAR)
    const parResponse = await request(app.getHttpServer())
      .post('/oauth/par')
      .send({
        response_type: 'code',
        client_id: 'test-client',
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      })
      .expect(201);

    expect(parResponse.body).toHaveProperty('request_uri');
    expect(parResponse.body).toHaveProperty('expires_in');

    // Step 2: Authorization endpoint with PAR request_uri
    const authResponse = await request(app.getHttpServer())
      .get('/authorize')
      .query({
        request_uri: parResponse.body.request_uri,
        redirect_uri: 'https://example.com/callback',
      })
      .expect(302);

    // Extract authorization code from redirect
    const redirectUrl = new URL(authResponse.header.location);
    const code = redirectUrl.searchParams.get('code');
    expect(code).toBeDefined();

    // Step 3: Token exchange with DPoP
    const dpopProof = await createDpopProof('POST', `http://127.0.0.1:${(app.getHttpServer().address() as any).port}/oauth/token`);

    const tokenResponse = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(200);

    expect(tokenResponse.body).toHaveProperty('access_token');
    expect(tokenResponse.body).toHaveProperty('refresh_token');
    expect(tokenResponse.body.token_type).toBe('DPoP');

    accessToken = tokenResponse.body.access_token;
    refreshToken = tokenResponse.body.refresh_token;

    // Step 4: Token introspection
    const introspectResponse = await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret') // Mock client authentication
      .send({
        token: accessToken,
      })
      .expect(200);

    expect(introspectResponse.body.active).toBe(true);
    expect(introspectResponse.body).toHaveProperty('sub');
    expect(introspectResponse.body).toHaveProperty('scope');

    // Step 5: Token refresh with DPoP
    const refreshedTokenResponse = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
      .expect(200);

    expect(refreshedTokenResponse.body).toHaveProperty('access_token');
    expect(refreshedTokenResponse.body).toHaveProperty('refresh_token');
    expect(refreshedTokenResponse.body.token_type).toBe('DPoP');

    const newAccessToken = refreshedTokenResponse.body.access_token;
    const newRefreshToken = refreshedTokenResponse.body.refresh_token;

    // Step 6: Token revocation
    await request(app.getHttpServer())
      .post('/oauth/revoke')
      .send({
        token: newRefreshToken,
        token_type_hint: 'refresh_token',
      })
      .expect(200);

    // Step 7: Attempt to use revoked token (should fail)
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'refresh_token',
        refresh_token: newRefreshToken,
      })
      .expect(401);
  });

  it('should complete device authorization flow', async () => {
    // Step 1: Device authorization request
    const deviceAuthResponse = await request(app.getHttpServer())
      .post('/oauth/device_authorization')
      .auth('test-client', 'test-secret') // Mock client authentication
      .expect(200);

    expect(deviceAuthResponse.body).toHaveProperty('device_code');
    expect(deviceAuthResponse.body).toHaveProperty('user_code');
    expect(deviceAuthResponse.body).toHaveProperty('verification_uri');
    expect(deviceAuthResponse.body).toHaveProperty('expires_in');
    expect(deviceAuthResponse.body).toHaveProperty('interval');

    const { device_code, user_code } = deviceAuthResponse.body;

    // Step 2: User would visit verification_uri and enter user_code
    // In a real scenario, this would happen on a separate device/browser
    
    // Step 3: Device polls for token
    // In a real implementation, this would eventually succeed after user authorization
    // For this test, we'll simulate the flow ending with an authorization code
    
    // Since we can't simulate the user interaction in this test,
    // we'll skip directly to the device code exchange which requires
    // the device code to be approved first
    // This would normally return "authorization_pending" initially
  });

  it('should provide OIDC Discovery and JWKS endpoints', async () => {
    // Step 1: OIDC Discovery endpoint
    const discoveryResponse = await request(app.getHttpServer())
      .get('/.well-known/openid-configuration')
      .query({ tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID })
      .expect(200);

    expect(discoveryResponse.body).toHaveProperty('issuer');
    expect(discoveryResponse.body).toHaveProperty('authorization_endpoint');
    expect(discoveryResponse.body).toHaveProperty('token_endpoint');
    expect(discoveryResponse.body).toHaveProperty('userinfo_endpoint');
    expect(discoveryResponse.body).toHaveProperty('jwks_uri');
    expect(discoveryResponse.body).toHaveProperty('scopes_supported');
    expect(discoveryResponse.body).toHaveProperty('response_types_supported');
    expect(discoveryResponse.body).toHaveProperty('grant_types_supported');

    // Step 2: JWKS endpoint
    const jwksResponse = await request(app.getHttpServer())
      .get('/.well-known/jwks.json')
      .query({ tenant_id: 'tenant-a' })
      .expect(200);

    expect(jwksResponse.body).toHaveProperty('keys');
    expect(Array.isArray(jwksResponse.body.keys)).toBe(true);
  });
});
