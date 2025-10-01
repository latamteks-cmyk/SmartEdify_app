import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('OidcDiscoveryController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/.well-known/openid-configuration (GET)', () => {
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    return request(app.getHttpServer())
      .get(`/.well-known/openid-configuration?tenant_id=${tenantId}`)
      .expect(200)
      .then((response) => {
        expect(response.body).toHaveProperty(
          'issuer',
          `https://auth.smartedify.global/t/${tenantId}`,
        );
        expect(response.body).toHaveProperty('authorization_endpoint');
        expect(response.body).toHaveProperty('token_endpoint');
        expect(response.body).toHaveProperty('jwks_uri');
      });
  });
});
