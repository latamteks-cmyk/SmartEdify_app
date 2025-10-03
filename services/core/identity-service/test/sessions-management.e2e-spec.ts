import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AddressInfo } from 'net';
import { Repository } from 'typeorm';
import {
  TestConfigurationFactory,
  TestModuleSetup,
  TEST_CONSTANTS,
} from './utils/test-configuration.factory';
import { UsersService } from '../src/modules/users/users.service';
import { Session } from '../src/modules/sessions/entities/session.entity';

describe('Sessions Management (e2e)', () => {
  let setup: TestModuleSetup;
  let app: INestApplication;
  let sessionsRepository: Repository<Session>;

  const getUrl = (endpoint: string): string => {
    const address = app.getHttpServer().address() as AddressInfo;
    if (!address) throw new Error('Server not listening');
    return `http://127.0.0.1:${address.port}${endpoint}`;
  };

  beforeAll(async () => {
    setup = await TestConfigurationFactory.createTestModule();
    app = setup.app;
    sessionsRepository = setup.sessionsRepository;
    await app.listen(0);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await TestConfigurationFactory.closeTestModule(setup);
  });

  it('should revoke a specific session by id', async () => {
    await TestConfigurationFactory.cleanDatabase(setup);

    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    const user = await usersService.create({
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'session-user',
      email: 'session@test.com',
      password: 'password',
      consent_granted: true,
    });

    const session = sessionsRepository.create({
      user,
      tenant_id: user.tenant_id,
      device_id: 'device-1',
      cnf_jkt: 'thumb-1',
      issued_at: new Date(),
      not_after: new Date(Date.now() + 60 * 60 * 1000),
      version: 1,
      created_at: new Date(),
    });
    const saved = await sessionsRepository.save(session);

    const response = await request(app.getHttpServer())
      .post(`/identity/v2/sessions/${saved.id}/revoke`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('has been revoked');

    const updated = await sessionsRepository.findOne({ where: { id: saved.id } });
    expect(updated?.revoked_at).toBeInstanceOf(Date);
  });

  it('should revoke all sessions for a subject', async () => {
    const usersService = setup.moduleFixture.get<UsersService>(UsersService);
    const user = await usersService.create({
      tenant_id: TEST_CONSTANTS.DEFAULT_TENANT_ID,
      username: 'subject-user',
      email: 'subject@test.com',
      password: 'password',
      consent_granted: true,
    });

    const response = await request(app.getHttpServer())
      .post(`/identity/v2/subject/revoke`)
      .send({ user_id: user.id, tenant_id: user.tenant_id });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('All sessions for subject');
  });
});

