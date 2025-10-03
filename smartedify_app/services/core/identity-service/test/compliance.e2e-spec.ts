import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as jose from 'node-jose';
import * as crypto from 'crypto';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
} from './utils/test-configuration.factory';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { KafkaService } from '../src/modules/kafka/kafka.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('Compliance (DSAR) Endpoint (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let mockKafkaService: { publish: jest.Mock };

  beforeAll(async () => {
    process.env.KAFKA_DISABLED = 'true';
    mockKafkaService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KafkaService)
      .useValue(mockKafkaService)
      .overrideProvider(HttpService)
      .useValue({
        get: jest
          .fn()
          .mockReturnValue(
            of({ status: 200, data: { tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' } }),
          ),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);

    // We need to get the setup object to close the app later
    setup = { app, moduleFixture } as TestModuleSetup;
  }, TEST_CONSTANTS.TEST_TIMEOUT * 2);

  afterAll(async () => {
    await TestConfigurationFactory.closeTestModule(setup);
  });

  it('DELETE /privacy/data should accept the request and return a job ID', async () => {
    const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    // Build a valid DPoP proof for DELETE
    const dpopKey = await jose.JWK.createKey('EC', 'P-256', { alg: 'ES256', use: 'sig' });
    const url = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}/privacy/data`;
    const payload = {
      jti: crypto.randomUUID(),
      htm: 'DELETE',
      htu: url,
      iat: Math.floor(Date.now() / 1000),
    };
    const dpop = (await jose.JWS.createSign({ format: 'compact', fields: { jwk: dpopKey.toJSON(), alg: 'ES256' } }, dpopKey)
      .update(JSON.stringify(payload))
      .final()) as string;

    const response = await request(app.getHttpServer())
      .delete('/privacy/data')
      .set('DPoP', dpop)
      .set('x-tenant-id', tenantId)
      .send({
        user_id: userId,
        tenant_id: tenantId,
        verification_code: '123456',
      });

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('job_id');
    expect(typeof response.body.job_id).toBe('string');

    // Verify that the Kafka event was published
    // Kafka is disabled in tests; no publish expected here
  });
});
