
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestConfigurationFactory, TestModuleSetup, TEST_CONSTANTS, TestTimeoutManager } from './utils/test-configuration.factory';
import { UsersService } from '../src/modules/users/users.service';
import { User } from '../src/modules/users/entities/user.entity';

describe('WebAuthn (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let usersService: UsersService;
  let testUser: User;

  beforeAll(async () => {
    setup = await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.createTestModule(),
      TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT,
      'WebAuthn test module initialization'
    );
    app = setup.app;
    usersService = setup.usersService;
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.cleanDatabase(setup),
      TEST_CONSTANTS.DATABASE_OPERATION_TIMEOUT,
      'Database cleanup'
    );

    testUser = await usersService.create({
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'webauthn-user',
      email: 'webauthn@test.com',
      password: 'password',
    });
  });

  afterAll(async () => {
    await TestTimeoutManager.withTimeout(
      () => TestConfigurationFactory.closeTestModule(setup),
      TEST_CONSTANTS.MAX_CLEANUP_TIME,
      'Test module cleanup'
    );
  });

  describe('Options Generation', () => {
    it('should return valid registration options', async () => {
      const response = await request(app.getHttpServer())
        .get('/webauthn/registration/options')
        .query({ username: testUser.email, userId: testUser.id });
      
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.rp).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.challenge).toBeDefined();
      expect(response.body.pubKeyCredParams).toBeDefined();
      expect(response.body.user.id).toBe(Buffer.from(testUser.id).toString('base64url'));
    });

    it('should return valid authentication options', async () => {
        const response = await request(app.getHttpServer())
          .get('/webauthn/authentication/options')
          .query({ username: testUser.email });
        
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body.challenge).toBeDefined();
      });
  });
});
