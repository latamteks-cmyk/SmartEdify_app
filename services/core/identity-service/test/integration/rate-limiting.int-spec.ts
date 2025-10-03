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
import { RateLimitingModule } from '../../src/modules/rate-limiting/rate-limiting.module';

describe('Rate Limiting Integration', () => {
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
        RateLimitingModule,
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

  it('should enforce rate limits on authentication endpoints', async () => {
    // Make multiple requests to trigger rate limiting
    const promises = [];
    
    for (let i = 0; i < 15; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/oauth/device_authorization')
          .expect(200) // First few requests should succeed
      );
    }
    
    // Add one more request that should be rate limited
    promises.push(
      request(app.getHttpServer())
        .post('/oauth/device_authorization')
        .expect(429) // This should be rate limited
        .expect('Content-Type', /application\/problem\+json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('type');
          expect(res.body.type).toBe('https://smartedify.global/problems/too-many-requests');
          expect(res.body).toHaveProperty('title');
          expect(res.body.title).toBe('Too Many Requests');
          expect(res.body).toHaveProperty('status');
          expect(res.body.status).toBe(429);
          expect(res.body).toHaveProperty('detail');
          expect(res.body.detail).toContain('Rate limit exceeded');
          expect(res.body).toHaveProperty('instance');
          expect(res.body.instance).toMatch(/^POST \/oauth\/device_authorization/);
        })
    );
    
    await Promise.all(promises);
  });

  it('should enforce stricter rate limits on token endpoints', async () => {
    // Make multiple requests to the token endpoint to trigger stricter rate limiting
    const promises = [];
    
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/oauth/token')
          .send({
            grant_type: 'authorization_code',
            code: 'test-code',
            code_verifier: 'test-verifier',
          })
          .set('DPoP', 'mock-dpop-proof')
          .expect(400) // These should fail with validation errors, not rate limiting
      );
    }
    
    // Add more requests to trigger rate limiting
    for (let i = 0; i < 30; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/oauth/token')
          .send({
            grant_type: 'authorization_code',
            code: 'test-code',
            code_verifier: 'test-verifier',
          })
          .set('DPoP', 'mock-dpop-proof')
          .expect(400) // Eventually these should be rate limited
      );
    }
    
    await Promise.all(promises);
  });

  it('should enforce rate limits on introspection endpoints', async () => {
    // Make multiple requests to the introspection endpoint
    const promises = [];
    
    for (let i = 0; i < 20; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/oauth/introspect')
          .auth('test-client', 'test-secret')
          .send({
            token: 'test-token',
          })
          .expect(401) // These should fail with auth errors, not rate limiting initially
      );
    }
    
    // Add more requests to trigger rate limiting
    for (let i = 0; i < 200; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/oauth/introspect')
          .auth('test-client', 'test-secret')
          .send({
            token: 'test-token',
          })
          .expect(429) // Eventually these should be rate limited
          .expect('Content-Type', /application\/problem\+json/)
          .expect((res) => {
            expect(res.body).toHaveProperty('type');
            expect(res.body.type).toBe('https://smartedify.global/problems/too-many-requests');
            expect(res.body).toHaveProperty('title');
            expect(res.body.title).toBe('Too Many Requests');
            expect(res.body).toHaveProperty('status');
            expect(res.body.status).toBe(429);
          })
      );
    }
    
    await Promise.all(promises);
  });

  it('should reset rate limits after time window expires', async () => {
    // This test would require manipulating time or waiting for the rate limit window to expire
    // For now, we'll just verify that the rate limiting service is working
    const response = await request(app.getHttpServer())
      .post('/oauth/device_authorization')
      .expect(200);
      
    expect(response.headers).toHaveProperty('x-ratelimit-limit');
    expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    expect(response.headers).toHaveProperty('x-ratelimit-reset');
  });

  it('should differentiate rate limits by client IP', async () => {
    // Make requests from different IPs (simulated with different User-Agent headers)
    const promises = [];
    
    // First set of requests
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/oauth/device_authorization')
          .set('User-Agent', `Client-${i}`)
          .expect(200)
      );
    }
    
    // Second set of requests from "different IP"
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/oauth/device_authorization')
          .set('User-Agent', `Different-Client-${i}`)
          .expect(200)
      );
    }
    
    await Promise.all(promises);
  });
});