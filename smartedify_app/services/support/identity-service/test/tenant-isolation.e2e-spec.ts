import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
  TestTimeoutManager,
} from './utils/test-configuration.factory';
import { KeyManagementService } from '../src/modules/keys/services/key-management.service';

describe('Tenant Isolation (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let keyManagementService: KeyManagementService;

  const tenantA = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const tenantB = 'b1ffac99-9c0b-4ef8-bb6d-6bb9bd380b22';

  beforeAll(async () => {
    setup = await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.createTestModule(),
      TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT,
      'Tenant Isolation test module initialization',
    );
    app = setup.app;
    keyManagementService = setup.keyManagementService;
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.cleanDatabase(setup),
      TEST_CONSTANTS.DATABASE_OPERATION_TIMEOUT,
      'Database cleanup',
    );
  });

  afterAll(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.closeTestModule(setup),
      TEST_CONSTANTS.MAX_CLEANUP_TIME,
      'Tenant Isolation test module cleanup',
    );
  });

  it('should only return keys for the specified tenant', async () => {
    // 1. Generate a key for Tenant A
    const keyA = await keyManagementService.generateNewKey(tenantA);

    // 2. Generate a key for Tenant B
    const keyB = await keyManagementService.generateNewKey(tenantB);

    // 3. Request keys for Tenant A
    const responseA = await request(app.getHttpServer())
      .get('/.well-known/jwks.json')
      .query({ tenant_id: tenantA });

    // Assertions for Tenant A
    expect(responseA.status).toBe(200);
    expect(responseA.body.keys).toHaveLength(1);
    expect(responseA.body.keys[0].kid).toBe(keyA.public_key_jwk['kid']);

    // 4. Request keys for Tenant B
    const responseB = await request(app.getHttpServer())
      .get('/.well-known/jwks.json')
      .query({ tenant_id: tenantB });

    // Assertions for Tenant B
    expect(responseB.status).toBe(200);
    expect(responseB.body.keys).toHaveLength(1);
    expect(responseB.body.keys[0].kid).toBe(keyB.public_key_jwk['kid']);
  });
});
