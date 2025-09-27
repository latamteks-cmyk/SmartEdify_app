
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestConfigurationFactory, TestModuleSetup, TEST_CONSTANTS, TestTimeoutManager } from './utils/test-configuration.factory';

describe('Device Authorization Flow (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;

  beforeAll(async () => {
    setup = await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.createTestModule(),
      TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT,
      'Device Flow test module initialization'
    );
    app = setup.app;
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.closeTestModule(setup),
      TEST_CONSTANTS.MAX_CLEANUP_TIME,
      'Device Flow test module cleanup'
    );
  });

  it('should return device and user codes on a successful request', async () => {
    const response = await request(app.getHttpServer())
      .post('/oauth/device_authorization')
      .send(); // No body needed for this request yet

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(typeof response.body.device_code).toBe('string');
    expect(typeof response.body.user_code).toBe('string');
    expect(response.body.user_code.length).toBe(8);
    expect(response.body.verification_uri).toBe('https://example.com/device');
    expect(response.body.expires_in).toBe(1800);
    expect(response.body.interval).toBe(5);
  });
});
