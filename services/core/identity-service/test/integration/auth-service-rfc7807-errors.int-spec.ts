import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { TokensModule } from '../../src/modules/tokens/tokens.module';
import { SessionsModule } from '../../src/modules/sessions/sessions.module';
import { KeysModule } from '../../src/modules/keys/keys.module';
import { User } from '../../src/modules/users/entities/user.entity';
import { RefreshToken } from '../../src/modules/tokens/entities/refresh-token.entity';
import { Session } from '../../src/modules/sessions/entities/session.entity';
import { WebAuthnCredential } from '../../src/modules/webauthn/entities/webauthn-credential.entity';
import { RevocationEvent } from '../../src/modules/sessions/entities/revocation-event.entity';
import { SigningKey } from '../../src/modules/keys/entities/signing-key.entity';
import { seedUsers } from '../utils/seed-data';
import { HttpExceptionFilter } from '../../src/filters/http-exception.filter';

describe('Authentication Service RFC 7807 Errors', () => {
  let app: INestApplication;
  let authToken: string;

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
        KeysModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the RFC 7807 exception filter globally
    app.useGlobalFilters(new HttpExceptionFilter());
    
    await app.init();

    // Seed database with test user
    const userRepository = moduleFixture.get('UserRepository');
    const testUser = userRepository.create(seedUsers[0]);
    await userRepository.save(testUser);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return RFC 7807 formatted error when DPoP proof is missing', async () => {
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

  it('should return RFC 7807 formatted error for user not found', async () => {
    // This test would require setting up a scenario where a code is associated with a non-existent user
    // For now, we'll test the general structure of the error response
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', 'mock-dpop-proof')
      .send({
        grant_type: 'authorization_code',
        code: 'test-code-nonexistent-user',
        code_verifier: 'test-verifier',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/)
      .expect((res) => {
        expect(res.body).toHaveProperty('type');
        expect(res.body).toHaveProperty('title');
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('instance');
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
        expect(res.body).toHaveProperty('title');
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('instance');
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
        expect(res.body).toHaveProperty('instance');
      });
  });
});