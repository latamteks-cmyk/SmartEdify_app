
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestConfigurationFactory, TestModuleSetup, TEST_CONSTANTS, TestTimeoutManager } from './utils/test-configuration.factory';
import * as crypto from 'crypto';

// Helper para PKCE
function generatePkce() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return { verifier, challenge };
}

describe('Pushed Authorization Requests (PAR - e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;

  beforeAll(async () => {
    setup = await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.createTestModule(),
      TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT,
      'PAR test module initialization'
    );
    app = setup.app;
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.closeTestModule(setup),
      TEST_CONSTANTS.MAX_CLEANUP_TIME,
      'PAR test module cleanup'
    );
  });

  it('should accept a pushed request and return a request_uri', async () => {
    const pkce = generatePkce();

    // 1. Push the authorization request details
    const parResponse = await request(app.getHttpServer())
      .post('/oauth/par')
      .send({
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'openid profile',
      });

    expect(parResponse.status).toBe(201);
    expect(parResponse.body).toHaveProperty('request_uri');
    expect(parResponse.body.request_uri).toMatch(/^urn:ietf:params:oauth:request_uri:/);
    expect(parResponse.body).toHaveProperty('expires_in', 60);

    const { request_uri } = parResponse.body;

    // 2. Use the request_uri at the authorize endpoint
    const authorizeResponse = await request(app.getHttpServer())
      .get('/authorize')
      .query({ request_uri });

    expect(authorizeResponse.status).toBe(200);
    expect(authorizeResponse.body).toHaveProperty('code');
    expect(typeof authorizeResponse.body.code).toBe('string');
  });

  it('should fail if using an invalid request_uri', async () => {
    const invalid_request_uri = 'urn:ietf:params:oauth:request_uri:invalid-uri';

    const authorizeResponse = await request(app.getHttpServer())
      .get('/authorize')
      .query({ request_uri: invalid_request_uri });

    expect(authorizeResponse.status).toBe(400);
    expect(authorizeResponse.body.message).toBe('Invalid or expired request_uri');
  });
});
