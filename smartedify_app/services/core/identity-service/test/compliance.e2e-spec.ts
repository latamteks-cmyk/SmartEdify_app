import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
} from './utils/test-configuration.factory';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { KafkaService } from '../src/modules/kafka/kafka.service';

describe('Compliance (DSAR) Endpoint (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let mockKafkaService: { publish: jest.Mock };

  beforeAll(async () => {
    mockKafkaService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KafkaService)
      .useValue(mockKafkaService)
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

    const response = await request(app.getHttpServer())
      .delete('/privacy/data')
      .send({
        user_id: userId,
        tenant_id: tenantId,
      });

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('jobId');
    expect(typeof response.body.jobId).toBe('string');

    // Verify that the Kafka event was published
    expect(mockKafkaService.publish).toHaveBeenCalledWith(
      'DataDeletionRequested',
      {
        user_id: userId,
        job_id: response.body.jobId,
        services: ['governance-service', 'user-profiles-service'],
      },
    );
  });
});
