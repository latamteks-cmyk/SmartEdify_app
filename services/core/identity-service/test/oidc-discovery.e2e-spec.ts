import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('OidcDiscoveryController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
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
  });

  it('/.well-known/openid-configuration (GET)', async () => {
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const response = await request(app.getHttpServer())
      .get(`/.well-known/openid-configuration?tenant_id=${tenantId}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      'issuer',
      `https://auth.smartedify.global/t/${tenantId}`,
    );
    expect(response.body).toHaveProperty('authorization_endpoint');
    expect(response.body).toHaveProperty('token_endpoint');
    expect(response.body).toHaveProperty('jwks_uri');
  });
});
