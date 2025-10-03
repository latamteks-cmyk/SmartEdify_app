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

describe('Security Integration', () => {
  let app: INestApplication;
  let validToken: string;
  let validRefreshToken: string;

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
    await app.init();

    // Seed database with test user
    const userRepository = moduleFixture.get('UserRepository');
    const testUser = userRepository.create(seedUsers[0]);
    await userRepository.save(testUser);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject requests without DPoP proof', async () => {
    // Try to get tokens without DPoP proof
    await request(app.getHttpServer())
      .post('/oauth/token')
      .send({
        grant_type: 'authorization_code',
        code: 'test-code',
        code_verifier: 'test-verifier',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(401); // Should be rejected with 401 Unauthorized
  });

  it('should reject invalid DPoP proofs', async () => {
    // Try to get tokens with invalid DPoP proof
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', 'invalid-dpop-proof')
      .send({
        grant_type: 'authorization_code',
        code: 'test-code',
        code_verifier: 'test-verifier',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(401); // Should be rejected with 401 Unauthorized
  });

  it('should enforce PKCE for authorization code flow', async () => {
    // Try to get authorization code without PKCE parameters
    await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        // Missing code_challenge and code_challenge_method
      })
      .expect(400); // Should be rejected with 400 Bad Request
  });

  it('should validate PKCE parameters correctly', async () => {
    // Try to exchange code with invalid code_verifier
    const dpopProof = 'mock-dpop-proof';

    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'authorization_code',
        code: 'invalid-test-code',
        code_verifier: 'invalid-verifier',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(400); // Should be rejected with 400 Bad Request
  });

  it('should detect and prevent refresh token reuse', async () => {
    // First, get a valid refresh token through the normal flow
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

    const dpopProof = 'mock-dpop-proof';

    const tokenResponse = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(200);

    const refreshToken = tokenResponse.body.refresh_token;

    // Use the refresh token once (should succeed)
    const firstUseResponse = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
      .expect(200);

    const newRefreshToken = firstUseResponse.body.refresh_token;

    // Try to use the same refresh token again (should fail)
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken, // Using the same token again
      })
      .expect(401); // Should be rejected with 401 Unauthorized

    // Try to use the new refresh token (should succeed)
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'refresh_token',
        refresh_token: newRefreshToken,
      })
      .expect(200);
  });

  it('should validate token signatures', async () => {
    // Get a valid token
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

    const dpopProof = 'mock-dpop-proof';

    const tokenResponse = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(200);

    const accessToken = tokenResponse.body.access_token;

    // Introspect the valid token
    const introspectResponse = await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret')
      .send({
        token: accessToken,
      })
      .expect(200);

    expect(introspectResponse.body.active).toBe(true);

    // Try to introspect an invalid token
    const invalidTokenResponse = await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret')
      .send({
        token: 'invalid-token-string',
      })
      .expect(200);

    expect(invalidTokenResponse.body.active).toBe(false);
  });

  it('should revoke tokens properly', async () => {
    // Get a valid token
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

    const dpopProof = 'mock-dpop-proof';

    const tokenResponse = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://example.com/callback',
      })
      .expect(200);

    const refreshToken = tokenResponse.body.refresh_token;

    // Revoke the refresh token
    await request(app.getHttpServer())
      .post('/oauth/revoke')
      .send({
        token: refreshToken,
        token_type_hint: 'refresh_token',
      })
      .expect(200);

    // Try to use the revoked refresh token (should fail)
    await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
      .expect(401); // Should be rejected with 401 Unauthorized
  });
});