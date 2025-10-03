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

describe('PKCE Enforcement Integration', () => {
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

  it('should enforce PKCE parameters for authorization requests', async () => {
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

  it('should accept requests with valid PKCE parameters', async () => {
    await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      })
      .expect(302); // Should redirect with authorization code
  });

  it('should enforce PKCE parameters in PAR requests', async () => {
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

  it('should accept PAR requests with valid PKCE parameters', async () => {
    await request(app.getHttpServer())
      .post('/oauth/par')
      .send({
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      })
      .expect(201); // Should create PAR request successfully
  });

  it('should validate code_verifier during token exchange', async () => {
    // First get an authorization code
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

    // Try to exchange code without code_verifier
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', 'mock-dpop-proof')
      .send({
        grant_type: 'authorization_code',
        code: code,
        // Missing code_verifier
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
        expect(res.body.detail).toBe(
          'code and code_verifier are required for authorization_code grant'
        );
        expect(res.body).toHaveProperty('instance');
        expect(res.body.instance).toMatch(/^POST \/oauth\/token/);
      });
  });

  it('should validate code_verifier correctness during token exchange', async () => {
    // First get an authorization code
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

    // Try to exchange code with invalid code_verifier
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', 'mock-dpop-proof')
      .send({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: 'invalid-verifier', // Incorrect verifier
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

  it('should successfully exchange code with correct PKCE parameters', async () => {
    // First get an authorization code
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

    // Exchange code with correct code_verifier
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', 'mock-dpop-proof')
      .send({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('access_token');
        expect(res.body).toHaveProperty('refresh_token');
        expect(res.body).toHaveProperty('token_type');
        expect(res.body.token_type).toBe('DPoP');
      });
  });
});