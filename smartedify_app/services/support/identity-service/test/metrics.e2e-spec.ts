
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestConfigurationFactory, TestModuleSetup, TEST_CONSTANTS, TestTimeoutManager } from './utils/test-configuration.factory';

describe('Metrics Endpoint (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;

  beforeAll(async () => {
    setup = await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.createTestModule(),
      TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT,
      'Metrics test module initialization'
    );
    app = setup.app;
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.closeTestModule(setup),
      TEST_CONSTANTS.MAX_CLEANUP_TIME,
      'Metrics test module cleanup'
    );
  });

  it('should expose a /metrics endpoint with default metrics', async () => {
    const response = await request(app.getHttpServer()).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.header['content-type']).toBe('text/plain; version=0.0.4; charset=utf-8');
    expect(typeof response.text).toBe('string');
    // Check for the presence of a few default metrics to confirm prom-client is working
    expect(response.text).toContain('process_cpu_user_seconds_total');
    expect(response.text).toContain('nodejs_heap_size_used_bytes');
  });
});
