import { INestApplication } from '@nestjs/common';
import request, { Response } from 'supertest';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
} from './utils/test-configuration.factory';
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

interface ParResponseBody {
  request_uri: string;
  expires_in: number;
}

interface AuthorizeResponseBody {
  code: string;
  message?: string;
}

describe('Pushed Authorization Requests (PAR - e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;

  beforeAll(async () => {
    setup = await TestConfigurationFactory.createTestModule();
    app = setup.app;
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestConfigurationFactory.closeTestModule(setup);
  });

  it('should accept a pushed request and return a request_uri', async () => {
    const pkce = generatePkce();

    const parResponse: Response = await request(app.getHttpServer())
      .post('/oauth/par')
      .send({
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'openid profile',
      });

    expect(parResponse.status).toBe(201);
    const parBody = parResponse.body as ParResponseBody;
    expect(parBody).toHaveProperty('request_uri');
    expect(parBody.request_uri).toMatch(/^urn:ietf:params:oauth:request_uri:/);
    expect(parBody).toHaveProperty('expires_in', 60);

    const { request_uri } = parBody;

    const authorizeResponse: Response = await request(app.getHttpServer())
      .get('/authorize')
      .query({ request_uri });

    expect(authorizeResponse.status).toBe(200);
    const authBody = authorizeResponse.body as AuthorizeResponseBody;
    expect(authBody).toHaveProperty('code');
    expect(typeof authBody.code).toBe('string');
  });

  it('should fail if using an invalid request_uri', async () => {
    const invalid_request_uri = 'urn:ietf:params:oauth:request_uri:invalid-uri';

    const authorizeResponse: Response = await request(app.getHttpServer())
      .get('/authorize')
      .query({ request_uri: invalid_request_uri });

    expect(authorizeResponse.status).toBe(400);
    const authBody = authorizeResponse.body as AuthorizeResponseBody;
    expect(authBody.message).toBe('Invalid or expired request_uri');
  });
});
