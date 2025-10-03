import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AddressInfo } from 'net';
import * as jose from 'node-jose';
import * as crypto from 'crypto';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
} from './utils/test-configuration.factory';
import { KeyManagementService } from '../src/modules/keys/services/key-management.service';

async function createDpopProof(httpMethod: string, httpUrl: string, signingKey: jose.JWK.Key): Promise<string> {
  const payload = {
    jti: crypto.randomUUID(),
    htm: httpMethod,
    htu: httpUrl,
    iat: Math.floor(Date.now() / 1000),
  };
  const proof = await jose.JWS.createSign(
    { format: 'compact', fields: { jwk: signingKey.toJSON(), alg: 'ES256' } },
    signingKey,
  ).update(JSON.stringify(payload)).final();
  return proof as string;
}

describe('QR Contextual Tokens (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;

  const getUrl = (endpoint: string): string => {
    const address = app.getHttpServer().address() as AddressInfo;
    if (!address) throw new Error('Server not listening');
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

  it('should generate a contextual token QR (guarded by DPoP)', async () => {
    const endpoint = '/identity/v2/contextual-tokens';
    const url = getUrl(endpoint);
    const dpopKey = await jose.JWK.createKey('EC', 'P-256', { alg: 'ES256', use: 'sig' });
    const proof = await jose.JWS.createSign(
      { format: 'compact', fields: { jwk: dpopKey.toJSON(), alg: 'ES256', typ: 'dpop+jwt' } },
      dpopKey,
    ).update(JSON.stringify({
      jti: crypto.randomUUID(),
      htm: 'POST',
      htu: url,
      iat: Math.floor(Date.now() / 1000),
    })).final() as string;

    const res = await request(app.getHttpServer())
      .post(endpoint)
      .set('DPoP', proof)
      .set('x-tenant-id', TEST_CONSTANTS.DEFAULT_TENANT_ID)
      .send({ event_id: 'ev-1', location: 'gate-1', audience: TEST_CONSTANTS.DEFAULT_TENANT_ID, expires_in: 60 });

    expect([200, 201]).toContain(res.status);
    expect(res.body.qr_code).toBeDefined();
    expect(res.body.expires_at).toBeDefined();
  });

  it('should validate a contextual token JWS with correct kid and audience', async () => {
    const kms = setup.moduleFixture.get<KeyManagementService>(KeyManagementService);
    const signingKey = await kms.getActiveSigningKey(TEST_CONSTANTS.DEFAULT_TENANT_ID);

    // Build a JWS with kid in header
    const privateKey = await jose.JWK.asKey(signingKey.private_key_pem, 'pem');
    const payload = {
      iss: `https://auth.smartedify.global/t/${TEST_CONSTANTS.DEFAULT_TENANT_ID}`,
      aud: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      sub: 'contextual-access',
      jti: `qr_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      event_id: 'ev-2',
      location: 'gate-2',
    };
    const token = await jose.JWS.createSign({ format: 'compact', fields: { alg: 'ES256', kid: signingKey.kid } }, privateKey)
      .update(JSON.stringify(payload)).final();

    // Call validate with DPoP
    const endpoint = '/identity/v2/contextual-tokens/validate';
    const url = getUrl(endpoint);
    const dpopKey = await jose.JWK.createKey('EC', 'P-256', { alg: 'ES256', use: 'sig' });
    const proof = await jose.JWS.createSign(
      { format: 'compact', fields: { jwk: dpopKey.toJSON(), alg: 'ES256', typ: 'dpop+jwt' } },
      dpopKey,
    ).update(JSON.stringify({
      jti: crypto.randomUUID(),
      htm: 'POST',
      htu: url,
      iat: Math.floor(Date.now() / 1000),
    })).final() as string;

    const res = await request(app.getHttpServer())
      .post(endpoint)
      .set('DPoP', proof)
      .set('x-tenant-id', TEST_CONSTANTS.DEFAULT_TENANT_ID)
      .send({ token, audience: TEST_CONSTANTS.DEFAULT_TENANT_ID });

    expect(res.status).toBe(201); // Nest default for POST
    expect(res.body.valid).toBe(true);
    expect(res.body.payload).toBeDefined();
  });
});
