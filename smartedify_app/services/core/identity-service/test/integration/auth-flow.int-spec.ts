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

describe('Authentication Flow Integration', () => {
  let app: INestApplication;
  let authToken: string;
  let refreshToken: string;

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

  it('should initiate device authorization flow', () => {
    return request(app.getHttpServer())
      .post('/oauth/device_authorization')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('device_code');
        expect(res.body).toHaveProperty('user_code');
        expect(res.body).toHaveProperty('verification_uri');
        expect(res.body).toHaveProperty('expires_in');
        expect(res.body).toHaveProperty('interval');
      });
  });

  it('should generate authorization code with PKCE', async () => {
    const response = await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      })
      .expect(302);

    // Extract code from redirect URL
    const redirectUrl = new URL(response.header.location);
    const code = redirectUrl.searchParams.get('code');
    expect(code).toBeDefined();
  });

  it('should exchange authorization code for tokens with DPoP', async () => {
    // First generate an authorization code
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

    // Create a mock DPoP proof (in a real test, we'd generate a proper one)
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

    expect(tokenResponse.body).toHaveProperty('access_token');
    expect(tokenResponse.body).toHaveProperty('refresh_token');
    expect(tokenResponse.body.token_type).toBe('DPoP');

    authToken = tokenResponse.body.access_token;
    refreshToken = tokenResponse.body.refresh_token;
  });

  it('should refresh tokens with DPoP binding', async () => {
    // Create a mock DPoP proof
    const dpopProof = 'mock-dpop-proof';

    const response = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
      .expect(200);

    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
    expect(response.body.token_type).toBe('DPoP');
  });

  it('should revoke a token', async () => {
    const response = await request(app.getHttpServer())
      .post('/oauth/revoke')
      .send({
        token: refreshToken,
        token_type_hint: 'refresh_token',
      })
      .expect(200);

    expect(response.body).toEqual({});
  });

  it('should introspect a token', async () => {
    // First authenticate as a client (this would normally require client credentials)
    // For this test, we'll mock the client authentication

    const response = await request(app.getHttpServer())
      .post('/oauth/introspect')
      .auth('test-client', 'test-secret') // Mock client credentials
      .send({
        token: authToken,
      })
      .expect(200);

    expect(response.body).toHaveProperty('active');
    expect(typeof response.body.active).toBe('boolean');
  });
});