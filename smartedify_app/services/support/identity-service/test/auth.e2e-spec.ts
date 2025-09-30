import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
} from './utils/test-configuration.factory';

describe('AuthController (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;

  beforeAll(async () => {
    setup = await TestConfigurationFactory.createTestModule();
    app = setup.app;
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await TestConfigurationFactory.cleanDatabase(setup);
  });

  afterAll(async () => {
    await TestConfigurationFactory.closeTestModule(setup);
  });

  it('/users (POST) - should create a new user', () => {
    const createUserDto = {
      tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    return request(app.getHttpServer())
      .post('/users')
      .send(createUserDto)
      .expect(201)
      .then((response) => {
        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toEqual(createUserDto.email);
      });
  });
});
