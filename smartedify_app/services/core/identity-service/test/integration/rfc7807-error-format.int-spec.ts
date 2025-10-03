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

describe('RFC 7807 Error Format Compliance', () => {
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

  it('should return RFC 7807 formatted error for missing DPoP proof', async () => {
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
        expect(res.body).toHaveProperty('type');
        expect(res.body.type).toBe('https://smartedify.global/problems/unauthorized');
        expect(res.body).toHaveProperty('title');
        expect(res.body.title).toBe('Unauthorized');
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe(401);
        expect(res.body).toHaveProperty('detail');
        expect(res.body.detail).toBe('DPoP proof is required');
        expect(res.body).toHaveProperty('instance');
        expect(res.body.instance).toMatch(/^POST \/oauth\/token/);
      });
  });

  it('should return RFC 7807 formatted error for invalid authorization code', async () => {
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', 'mock-dpop-proof')
      .send({
        grant_type: 'authorization_code',
        code: 'invalid-code',
        code_verifier: 'test-verifier',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('type');
        expect(res.body.type).toBe('https://smartedify.global/problems/bad-request');
        expect(res.body).toHaveProperty('title');
        expect(res.body.title).toBe('Bad Request');
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe(400);
        expect(res.body).toHaveProperty('detail');
        expect(res.body.detail).toBe('Invalid authorization code');
        expect(res.body).toHaveProperty('instance');
        expect(res.body.instance).toMatch(/^POST \/oauth\/token/);
      });
  });

  it('should return RFC 7807 formatted error for missing required parameters', async () => {
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', 'mock-dpop-proof')
      .send({
        grant_type: 'authorization_code',
        // Missing code and code_verifier
        redirect_uri: 'https://example.com/callback',
      })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('type');
        expect(res.body.type).toBe('https://smartedify.global/problems/bad-request');
        expect(res.body).toHaveProperty('title');
        expect(res.body.title).toBe('Bad Request');
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe(400);
        expect(res.body).toHaveProperty('detail');
        expect(res.body.detail).toBe('Code and code_verifier are required');
        expect(res.body).toHaveProperty('instance');
        expect(res.body.instance).toMatch(/^POST \/oauth\/token/);
      });
  });

  it('should return RFC 7807 formatted error for invalid code verifier', async () => {
    // First get a valid authorization code
    const authResponse = await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      });

    const redirectUrl = new URL(authResponse.header.location);
    const code = redirectUrl.searchParams.get('code');

    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', 'mock-dpop-proof')
      .send({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: 'invalid-verifier', // Invalid verifier
        redirect_uri: 'https://example.com/callback',
      })
      .expect(401)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('type');
        expect(res.body.type).toBe('https://smartedify.global/problems/unauthorized');
        expect(res.body).toHaveProperty('title');
        expect(res.body.title).toBe('Unauthorized');
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe(401);
        expect(res.body).toHaveProperty('detail');
        expect(res.body.detail).toBe('Invalid code verifier');
        expect(res.body).toHaveProperty('instance');
        expect(res.body.instance).toMatch(/^POST \/oauth\/token/);
      });
  });

  it('should return RFC 7807 formatted error for missing PKCE parameters in authorize endpoint', async () => {
    await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        // Missing code_challenge and code_challenge_method
      })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('type');
        expect(res.body.type).toBe('https://smartedify.global/problems/bad-request');
        expect(res.body).toHaveProperty('title');
        expect(res.body.title).toBe('Bad Request');
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe(400);
        expect(res.body).toHaveProperty('detail');
        expect(res.body.detail).toBe(
          'PKCE parameters (code_challenge, code_challenge_method) are required'
        );
        expect(res.body).toHaveProperty('instance');
        expect(res.body.instance).toMatch(/^GET \/authorize/);
      });
  });

  it('should return RFC 7807 formatted error for missing PKCE parameters in PAR endpoint', async () => {
    await request(app.getHttpServer())
      .post('/oauth/par')
      .send({
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        // Missing code_challenge and code_challenge_method
      })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('type');
        expect(res.body.type).toBe('https://smartedify.global/problems/bad-request');
        expect(res.body).toHaveProperty('title');
        expect(res.body.title).toBe('Bad Request');
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe(400);
        expect(res.body).toHaveProperty('detail');
        expect(res.body.detail).toBe('PKCE parameters are required in PAR payload');
        expect(res.body).toHaveProperty('instance');
        expect(res.body.instance).toMatch(/^POST \/oauth\/par/);
      });
  });

  it('should return RFC 7807 formatted error for invalid refresh token', async () => {
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', 'mock-dpop-proof')
      .send({
        grant_type: 'refresh_token',
        refresh_token: 'invalid-refresh-token',
      })
      .expect(401) // Should be 401 Unauthorized for invalid refresh token
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('type');
        expect(res.body.type).toBe('https://smartedify.global/problems/unauthorized');
        expect(res.body).toHaveProperty('title');
        expect(res.body.title).toBe('Unauthorized');
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe(401);
        expect(res.body).toHaveProperty('instance');
        expect(res.body.instance).toMatch(/^POST \/oauth\/token/);
      });
  });

  it('should return RFC 7807 formatted error for missing refresh token', async () => {
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', 'mock-dpop-proof')
      .send({
        grant_type: 'refresh_token',
        // Missing refresh_token
      })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('type');
        expect(res.body.type).toBe('https://smartedify.global/problems/bad-request');
        expect(res.body).toHaveProperty('title');
        expect(res.body.title).toBe('Bad Request');
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe(400);
        expect(res.body).toHaveProperty('detail');
        expect(res.body.detail).toBe('refresh_token is required');
        expect(res.body).toHaveProperty('instance');
        expect(res.body.instance).toMatch(/^POST \/oauth\/token/);
      });
  });

  it('should return RFC 7807 formatted error for device code not found', async () => {
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', 'mock-dpop-proof')
      .send({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: 'nonexistent-device-code',
      })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('type');
        expect(res.body.type).toBe('https://smartedify.global/problems/bad-request');
        expect(res.body).toHaveProperty('title');
        expect(res.body.title).toBe('Bad Request');
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe(400);
        expect(res.body).toHaveProperty('instance');
        expect(res.body.instance).toMatch(/^POST \/oauth\/token/);
      });
  });

  it('should return RFC 7807 formatted error with additional fields when provided', async () => {
    // Create a custom error with additional fields
    const customError = new Rfc7807Exception({
      type: 'https://smartedify.global/problems/custom-error',
      title: 'Custom Error',
      detail: 'This is a custom error with additional fields',
      instance: '/test-custom-error',
      errorCode: 'CUSTOM_001',
      help: 'https://smartedify.global/help/custom-error',
    }, 422);

    // In a real implementation, this would be handled by the exception filter
    // For this test, we're just verifying the structure of the RFC 7807 exception
    
    expect(customError).toBeDefined();
    expect(customError).toBeInstanceOf(Rfc7807Exception);
    
    // The exception should have the correct structure
    const response = customError.getResponse();
    expect(response).toHaveProperty('type');
    expect(response).toHaveProperty('title');
    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('detail');
    expect(response).toHaveProperty('instance');
    expect(response).toHaveProperty('errorCode');
    expect(response).toHaveProperty('help');
    
    expect(response.type).toBe('https://smartedify.global/problems/custom-error');
    expect(response.title).toBe('Custom Error');
    expect(response.status).toBe(422);
    expect(response.detail).toBe('This is a custom error with additional fields');
    expect(response.instance).toBe('/test-custom-error');
    expect(response.errorCode).toBe('CUSTOM_001');
    expect(response.help).toBe('https://smartedify.global/help/custom-error');
  });
});