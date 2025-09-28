import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as jose from 'node-jose';
import * as crypto from 'crypto';
import { TestConfigurationFactory, TestModuleSetup, TEST_CONSTANTS } from './utils/test-configuration.factory';
import { ClientStoreService } from '../src/modules/clients/client-store.service';

describe('Introspect Endpoint (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let clientKey: jose.JWK.Key;
  let accessToken: string;
  const clientId = 'test-client-for-jwt-auth';
  const keyId = 'test-key-1';

  beforeAll(async () => {
    setup = await TestConfigurationFactory.createTestModule();
    app = setup.app;
    await app.init();
    await app.listen(0);

    // For testing purposes, create a dynamic key
    clientKey = await jose.JWK.createKey('EC', 'P-256', { alg: 'ES256', use: 'sig' });
    
    // Extract the public key to use in client validation
    const publicJwk = clientKey.toJSON(false); // false = public key only
    console.log('Generated public key for testing:', JSON.stringify(publicJwk, null, 2));

    // Dynamically update the client store with the correct public key
    const clientStoreService = setup.moduleFixture.get<ClientStoreService>(ClientStoreService);
    const originalFindMethod = clientStoreService.findClientById.bind(clientStoreService);
    clientStoreService.findClientById = async (clientId: string) => {
      if (clientId === 'test-client-for-jwt-auth') {
        return {
          client_id: 'test-client-for-jwt-auth',
          jwks: {
            keys: [
              {
                ...publicJwk,
                kid: keyId,
              },
            ],
          },
        };
      }
      return originalFindMethod(clientId);
    };

    // For introspect tests, we'll create a mock token since the full OAuth flow 
    // requires complex setup that's already tested in other E2E tests
    accessToken = 'mock_access_token_for_introspect_test';
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestConfigurationFactory.closeTestModule(setup);
  });

  const introspectEndpoint = '/oauth/introspect';

  async function createClientAssertion(payload: object) {
    const finalPayload = JSON.stringify({
        jti: crypto.randomUUID(),
        iat: Math.floor(Date.now() / 1000),
        ...payload,
    });
    const options = { format: 'compact' as const, fields: { kid: keyId } };
    return jose.JWS.createSign(options, clientKey).update(finalPayload).final();
  }

  it('should return 401 with unregistered client key for introspection', async () => {
    // Use a different client ID that's not registered
    const unregisteredClientId = 'unregistered-test-client';
    const url = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}${introspectEndpoint}`;
    const assertion = await createClientAssertion({
        iss: unregisteredClientId,
        sub: unregisteredClientId,
        aud: url,
        exp: Math.floor(Date.now() / 1000) + 60,
    });

    // Test the introspect endpoint with unregistered client key
    const response = await request(app.getHttpServer())
      .post(introspectEndpoint)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        token: accessToken,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      });

    // The endpoint should respond with 401 due to unregistered client key
    expect(response.status).toBe(401);
  });

  it('should return 401 with invalid token and unregistered client', async () => {
    // Use a different client ID that's not registered
    const unregisteredClientId = 'another-unregistered-client';
    const url = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}${introspectEndpoint}`;
    const assertion = await createClientAssertion({
        iss: unregisteredClientId,
        sub: unregisteredClientId,
        aud: url,
        exp: Math.floor(Date.now() / 1000) + 60,
    });

    const response = await request(app.getHttpServer())
      .post(introspectEndpoint)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        token: 'some_token_to_introspect',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      });

    expect(response.status).toBe(401);
  });

  it('should fail with 401 due to invalid client authentication', async () => {
    const url = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}${introspectEndpoint}`;
    const assertion = await createClientAssertion({
        iss: 'wrong-client-id',
        sub: 'wrong-client-id',
        aud: url,
        exp: Math.floor(Date.now() / 1000) + 60,
    });

    const response = await request(app.getHttpServer())
      .post(introspectEndpoint)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        token: 'some_token_to_introspect',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      });

    // Should fail with 401 due to invalid client authentication
    expect(response.status).toBe(401);
  });

  it('should fail with 401 if token parameter is missing (auth before validation)', async () => {
    // Use a different client ID that's not registered to test authentication failure
    const unregisteredClientId = 'yet-another-unregistered-client';
    const url = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}${introspectEndpoint}`;
    const assertion = await createClientAssertion({
        iss: unregisteredClientId,
        sub: unregisteredClientId,
        aud: url,
        exp: Math.floor(Date.now() / 1000) + 60,
    });

    const response = await request(app.getHttpServer())
      .post(introspectEndpoint)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      });

    // Since auth is validated before parameter validation, expects 401
    expect(response.status).toBe(401);
  });

  it('should fail with 400 if client_assertion is missing', async () => {
    const response = await request(app.getHttpServer())
      .post(introspectEndpoint)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        token: 'some_token_to_introspect',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      });

    expect(response.status).toBe(400);
  });
});