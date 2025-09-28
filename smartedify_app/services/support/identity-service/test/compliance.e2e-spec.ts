import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestConfigurationFactory, TestModuleSetup, TEST_CONSTANTS } from './utils/test-configuration.factory';
import { KafkaService } from '../src/modules/kafka/kafka.service';

describe('Compliance (DSAR) Endpoint (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let kafkaService: KafkaService;

  beforeAll(async () => {
    setup = await TestConfigurationFactory.createTestModule();
    app = setup.app;
    kafkaService = setup.moduleFixture.get<KafkaService>(KafkaService);
    await app.init();
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestConfigurationFactory.closeTestModule(setup);
  });

  it('DELETE /privacy/data should accept the request and return a job ID', async () => {
    const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const kafkaSpy = jest.spyOn(kafkaService, 'publish');

    const response = await request(app.getHttpServer())
      .delete('/privacy/data')
      .send({ user_id: userId });

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('jobId');
    expect(typeof response.body.jobId).toBe('string');

    // Verify that the Kafka event was published
    expect(kafkaSpy).toHaveBeenCalledWith('DataDeletionRequested', {
      user_id: userId,
      job_id: response.body.jobId,
      services: ['governance-service', 'user-profiles-service'],
    });

    kafkaSpy.mockRestore();
  });
});
