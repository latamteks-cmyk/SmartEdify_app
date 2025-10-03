import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/entities/user.entity';
import { RefreshToken } from '../../src/modules/tokens/entities/refresh-token.entity';
import { Session } from '../../src/modules/sessions/entities/session.entity';
import { WebAuthnCredential } from '../../src/modules/webauthn/entities/webauthn-credential.entity';
import { RevocationEvent } from '../../src/modules/sessions/entities/revocation-event.entity';
import { SigningKey } from '../../src/modules/keys/entities/signing-key.entity';
import { HttpExceptionFilter } from '../../src/filters/http-exception.filter';

describe('Enhanced Introspection Security Integration', () => {
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

  it('should require client authentication for introspection requests', async () => {
    await request(app.getHttpServer())
      .post('/oauth/introspect')
      .send({
        token: 'test-token',
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
        expect(res.body.detail).toContain('Invalid client authentication method');
        expect(res.body).toHaveProperty('instance');
        expect(res.body.instance).toMatch(/^POST \/oauth\/introspect/);
      });
  });

  it('should return active=false for missing token parameter', async () => {
    // This test would require proper client authentication setup
    // For now, we'll test the general structure
    await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret') // Mock client authentication
      .send({
        // Missing token parameter
      })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('active');
        expect(res.body.active).toBe(false);
      });
  });

  it('should return active=false for invalid token format', async () => {
    await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret') // Mock client authentication
      .send({
        token: 'invalid-token-format', // Not a JWT
      })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('active');
        expect(res.body.active).toBe(false);
      });
  });

  it('should return active=false for expired tokens', async () => {
    // Create an expired JWT-like token for testing
    const expiredToken = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Header
      'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9', // Expired payload
      'signature' // Signature (not validated in this test)
    ].join('.');

    await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret') // Mock client authentication
      .send({
        token: expiredToken,
      })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('active');
        expect(res.body.active).toBe(false);
      });
  });

  it('should return active=true with token metadata for valid tokens', async () => {
    // Create a valid JWT-like token for testing
    const now = Math.floor(Date.now() / 1000);
    const validToken = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Header
      Buffer.from(JSON.stringify({
        sub: 'test-user',
        scope: 'openid profile',
        client_id: 'test-client',
        iat: now,
        exp: now + 3600, // Expires in 1 hour
      })).toString('base64url'), // Valid payload
      'signature' // Signature (not validated in this test)
    ].join('.');

    await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret') // Mock client authentication
      .send({
        token: validToken,
      })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('active');
        expect(res.body.active).toBe(true);
        expect(res.body).toHaveProperty('sub');
        expect(res.body.sub).toBe('test-user');
        expect(res.body).toHaveProperty('scope');
        expect(res.body.scope).toBe('openid profile');
        expect(res.body).toHaveProperty('client_id');
        expect(res.body.client_id).toBe('test-client');
        expect(res.body).toHaveProperty('iat');
        expect(res.body).toHaveProperty('exp');
      });
  });

  it('should handle introspection errors gracefully', async () => {
    // Send malformed token data
    await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret') // Mock client authentication
      .send({
        token: 'malformed..token', // Malformed JWT
      })
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('active');
        expect(res.body.active).toBe(false);
      });
  });

  it('should return appropriate metadata for different token types', async () => {
    // Test with access token
    const accessToken = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      Buffer.from(JSON.stringify({
        sub: 'access-token-user',
        scope: 'openid profile email',
        client_id: 'test-client',
        token_type: 'Bearer',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })).toString('base64url'),
      'signature'
    ].join('.');

    const accessResponse = await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret')
      .send({
        token: accessToken,
      })
      .expect(200);

    expect(accessResponse.body.active).toBe(true);
    expect(accessResponse.body.sub).toBe('access-token-user');
    expect(accessResponse.body.scope).toBe('openid profile email');
    expect(accessResponse.body.client_id).toBe('test-client');
    expect(accessResponse.body.token_type).toBe('Bearer');

    // Test with refresh token (different structure)
    const refreshToken = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      Buffer.from(JSON.stringify({
        sub: 'refresh-token-user',
        scope: 'openid',
        client_id: 'test-client',
        token_type: 'Refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 2592000, // 30 days
      })).toString('base64url'),
      'signature'
    ].join('.');

    const refreshResponse = await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret')
      .send({
        token: refreshToken,
      })
      .expect(200);

    expect(refreshResponse.body.active).toBe(true);
    expect(refreshResponse.body.sub).toBe('refresh-token-user');
    expect(refreshResponse.body.scope).toBe('openid');
    expect(refreshResponse.body.client_id).toBe('test-client');
    expect(refreshResponse.body.token_type).toBe('Refresh');
  });
});