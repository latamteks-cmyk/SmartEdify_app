import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as jose from 'node-jose';
import * as crypto from 'crypto';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/filters/all-exceptions.filter';
import { ClientStoreService } from '../src/modules/clients/client-store.service';
import { TEST_CONSTANTS } from './utils/test-configuration.factory';
import { AddressInfo } from 'net';

describe('Introspect Endpoint (e2e)', () => {
  let app: INestApplication;
  let clientKey: jose.JWK.Key;
  const keyId = 'test-key-1';

  async function createClientAssertion(payload: object): Promise<string> {
    const finalPayload = JSON.stringify({
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      ...payload,
    });
    const options = { format: 'compact' as const, fields: { kid: keyId } };
    const signed = await jose.JWS.createSign(options, clientKey)
      .update(finalPayload)
      .final();
    return signed as string;
  }

  beforeAll(async () => {
    clientKey = await jose.JWK.createKey('EC', 'P-256', {
      alg: 'ES256',
      use: 'sig',
    });
    const publicJwk = clientKey.toJSON(false);

    const mockClientStoreService = {
      findClientById: jest.fn(async (clientId: string) => {
        if (clientId === 'test-client-for-jwt-auth') {
          return {
            client_id: 'test-client-for-jwt-auth',
            jwks: { keys: [{ ...publicJwk, kid: keyId }] },
          };
        }
        return null;
      }),
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ClientStoreService)
      .useValue(mockClientStoreService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await app.close();
  });

  const introspectEndpoint = '/oauth/introspect';
  const getUrl = (endpoint: string): string => {
    const address = app.getHttpServer().address() as AddressInfo;
    return `http://127.0.0.1:${address.port}${endpoint}`;
  };

  it('should return 401 with unregistered client key', async () => {
    const unregisteredClientId = 'unregistered-test-client';
    const url = getUrl(introspectEndpoint);
    const assertion = await createClientAssertion({
      iss: unregisteredClientId,
      sub: unregisteredClientId,
      aud: url,
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    await request(app.getHttpServer())
      .post(introspectEndpoint)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        token: 'mock_access_token',
        client_assertion_type:
          'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      })
      .expect(401);
  });

  it('should fail with 401 due to invalid client authentication', async () => {
    const url = getUrl(introspectEndpoint);
    const assertion = await createClientAssertion({
      iss: 'wrong-client-id',
      sub: 'wrong-client-id',
      aud: url,
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    await request(app.getHttpServer())
      .post(introspectEndpoint)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        token: 'some_token_to_introspect',
        client_assertion_type:
          'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      })
      .expect(401);
  });

  it('should fail with 400 if client_assertion is missing', async () => {
    await request(app.getHttpServer())
      .post(introspectEndpoint)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        token: 'some_token_to_introspect',
        client_assertion_type:
          'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      })
      .expect(400);
  });
});
