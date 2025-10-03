import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AuthModule } from '../../../src/modules/auth/auth.module';
import { UsersModule } from '../../../src/modules/users/entities/user.entity';
import { RefreshToken } from '../../../src/modules/tokens/entities/refresh-token.entity';
import { Session } from '../../../src/modules/sessions/entities/session.entity';
import { WebAuthnCredential } from '../../../src/modules/webauthn/entities/webauthn-credential.entity';
import { RevocationEvent } from '../../../src/modules/sessions/entities/revocation-event.entity';
import { SigningKey } from '../../../src/modules/keys/entities/signing-key.entity';
import { HttpExceptionFilter } from '../../../src/filters/http-exception.filter';
import { Rfc7807Exception } from '../../../src/exceptions/rfc7807.exception';

describe('RFC 7807 Error Format Comprehensive Test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'user',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_TEST_DATABASE || 'identity_test_db',
          entities: [User, RefreshToken, Session, WebAuthnCredential, RevocationEvent, SigningKey],
          synchronize: true,
          dropSchema: true,
        }),
        AuthModule,
        UsersModule,
        TokensModule,
        SessionsModule,
        WebauthnModule,
        KeysModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the RFC 7807 exception filter globally
    app.useGlobalFilters(new HttpExceptionFilter());
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper function to validate RFC 7807 error format
  const validateRfc7807Error = (res: request.Response, expected: {
    type: string;
    title: string;
    status: number;
    detail?: string;
  }) => {
    expect(res.body).toHaveProperty('type');
    expect(res.body.type).toBe(expected.type);
    expect(res.body).toHaveProperty('title');
    expect(res.body.title).toBe(expected.title);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toBe(expected.status);
    expect(res.body).toHaveProperty('instance');
    expect(res.body.instance).toMatch(new RegExp(`^${res.req.method} ${res.req.path}`));
    
    if (expected.detail) {
      expect(res.body).toHaveProperty('detail');
      expect(res.body.detail).toBe(expected.detail);
    }
  };

  it('should return RFC 7807 formatted error for bad requests', async () => {
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', 'mock-dpop-proof')
      .send({
        grant_type: 'invalid_grant_type',
      })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        validateRfc7807Error(res, {
          type: 'https://smartedify.global/problems/bad-request',
          title: 'Bad Request',
          status: 400,
          detail: 'Invalid grant_type',
        });
      });
  });

  it('should return RFC 7807 formatted error for unauthorized requests', async () => {
    await request(app.getHttpServer())
      .post('/oauth/token')
      .send({
        grant_type: 'authorization_code',
        code: 'test-code',
        code_verifier: 'test-verifier',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(401)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        validateRfc7807Error(res, {
          type: 'https://smartedify.global/problems/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'DPoP proof is required',
        });
      });
  });

  it('should return RFC 7807 formatted error for forbidden requests', async () => {
    // This would require setting up a scenario where access is forbidden
    // For now, we'll just test that the error format is correct
    await request(app.getHttpServer())
      .get('/forbidden-test')
      .expect(403)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        validateRfc7807Error(res, {
          type: 'https://smartedify.global/problems/forbidden',
          title: 'Forbidden',
          status: 403,
        });
      });
  });

  it('should return RFC 7807 formatted error for not found requests', async () => {
    await request(app.getHttpServer())
      .get('/non-existent-endpoint')
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        validateRfc7807Error(res, {
          type: 'https://smartedify.global/problems/not-found',
          title: 'Not Found',
          status: 404,
        });
      });
  });

  it('should return RFC 7807 formatted error for conflicts', async () => {
    // This would require setting up a scenario where there's a conflict
    // For now, we'll just test that the error format is correct
    await request(app.getHttpServer())
      .post('/conflict-test')
      .expect(409)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        validateRfc7807Error(res, {
          type: 'https://smartedify.global/problems/conflict',
          title: 'Conflict',
          status: 409,
        });
      });
  });

  it('should return RFC 7807 formatted error for unprocessable entities', async () => {
    // This would require setting up a scenario where there's an unprocessable entity
    // For now, we'll just test that the error format is correct
    await request(app.getHttpServer())
      .post('/unprocessable-test')
      .expect(422)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        validateRfc7807Error(res, {
          type: 'https://smartedify.global/problems/unprocessable-entity',
          title: 'Unprocessable Entity',
          status: 422,
        });
      });
  });

  it('should return RFC 7807 formatted error for too many requests', async () => {
    // This would require setting up a rate limiting scenario
    // For now, we'll just test that the error format is correct
    await request(app.getHttpServer())
      .post('/too-many-requests-test')
      .expect(429)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        validateRfc7807Error(res, {
          type: 'https://smartedify.global/problems/too-many-requests',
          title: 'Too Many Requests',
          status: 429,
        });
      });
  });

  it('should return RFC 7807 formatted error for internal server errors', async () => {
    // This would require setting up a scenario where there's an internal server error
    // For now, we'll just test that the error format is correct
    await request(app.getHttpServer())
      .post('/internal-error-test')
      .expect(500)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        validateRfc7807Error(res, {
          type: 'https://smartedify.global/problems/internal-server-error',
          title: 'Internal Server Error',
          status: 500,
        });
      });
  });

  it('should include additional fields in custom RFC 7807 errors', async () => {
    // Create a test endpoint that throws a custom RFC 7807 exception with additional fields
    app.get('/custom-error-test', (req, res) => {
      throw new Rfc7807Exception({
        type: 'https://smartedify.global/problems/custom-error',
        title: 'Custom Error',
        detail: 'This is a custom error with additional fields',
        instance: '/custom-error-test',
        errorCode: 'CUSTOM_001',
        help: 'https://smartedify.global/help/custom-error',
      }, 422);
    });

    await request(app.getHttpServer())
      .get('/custom-error-test')
      .expect(422)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        validateRfc7807Error(res, {
          type: 'https://smartedify.global/problems/custom-error',
          title: 'Custom Error',
          status: 422,
          detail: 'This is a custom error with additional fields',
        });
        
        // Verify additional fields
        expect(res.body).toHaveProperty('errorCode');
        expect(res.body.errorCode).toBe('CUSTOM_001');
        expect(res.body).toHaveProperty('help');
        expect(res.body.help).toBe('https://smartedify.global/help/custom-error');
      });
  });

  it('should maintain consistent error format across all endpoints', async () => {
    // Test multiple endpoints to ensure consistent RFC 7807 error format
    const endpoints = [
      { method: 'GET', path: '/authorize', expectedStatus: 400 },
      { method: 'POST', path: '/oauth/token', expectedStatus: 401 },
      { method: 'POST', path: '/oauth/revoke', expectedStatus: 400 },
      { method: 'POST', path: '/oauth/introspect', expectedStatus: 401 },
      { method: 'POST', path: '/oauth/par', expectedStatus: 400 },
      { method: 'POST', path: '/oauth/device_authorization', expectedStatus: 400 },
    ];

    for (const endpoint of endpoints) {
      await request(app.getHttpServer())
        [endpoint.method.toLowerCase()](endpoint.path)
        .expect(endpoint.expectedStatus)
        .expect('Content-Type', /application\/problem\+json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('type');
          expect(res.body).toHaveProperty('title');
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('instance');
          expect(res.body.status).toBe(endpoint.expectedStatus);
        });
    }
  });

  it('should return proper content type for RFC 7807 errors', async () => {
    await request(app.getHttpServer())
      .get('/non-existent-endpoint')
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/);
  });

  it('should include method and path in instance field', async () => {
    await request(app.getHttpServer())
      .get('/non-existent-endpoint')
      .expect(404)
      .expect((res) => {
        expect(res.body.instance).toBe('GET /non-existent-endpoint');
      });
  });

  it('should handle complex error scenarios with proper RFC 7807 format', async () => {
    // Test a complex scenario with multiple validation errors
    await request(app.getHttpServer())
      .post('/oauth/token')
      .send({
        grant_type: 'authorization_code',
        // Missing required fields
      })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        validateRfc7807Error(res, {
          type: 'https://smartedify.global/problems/bad-request',
          title: 'Bad Request',
          status: 400,
          detail: 'Code and code_verifier are required for authorization_code grant',
        });
      });
  });
});