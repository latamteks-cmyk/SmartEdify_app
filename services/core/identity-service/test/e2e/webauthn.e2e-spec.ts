import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';

describe('WebAuthn E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a new WebAuthn credential', () => {
    // This would test the complete WebAuthn registration flow
    return request(app.getHttpServer())
      .post('/webauthn/attestation/options')
      .send({
        username: 'test-user',
        tenant_id: 'test-tenant',
      })
      .expect(200);
  });

  it('should authenticate with WebAuthn credential', () => {
    // This would test the complete WebAuthn authentication flow
    return request(app.getHttpServer())
      .post('/webauthn/assertion/options')
      .send({
        username: 'test-user',
        tenant_id: 'test-tenant',
      })
      .expect(200);
  });
});
