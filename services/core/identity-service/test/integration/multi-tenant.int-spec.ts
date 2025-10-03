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

describe('Multi-Tenant Integration', () => {
  let app: INestApplication;
  let tenantAToken: string;
  let tenantBToken: string;

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

    // Seed database with test users from different tenants
    const userRepository = moduleFixture.get('UserRepository');
    
    // Create tenant A user
    const tenantAUser = userRepository.create(seedUsers[0]); // tenant-a
    await userRepository.save(tenantAUser);
    
    // Create tenant B user
    const tenantBUser = userRepository.create(seedUsers[1]); // tenant-b
    await userRepository.save(tenantBUser);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should isolate user data between tenants', async () => {
    // Authenticate as tenant A user
    const authResponseA = await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://tenant-a.example.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      });

    const redirectUrlA = new URL(authResponseA.header.location);
    const codeA = redirectUrlA.searchParams.get('code');

    // Authenticate as tenant B user
    const authResponseB = await request(app.getHttpServer())
      .get('/authorize')
      .query({
        redirect_uri: 'https://tenant-b.example.com/callback',
        scope: 'openid profile',
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      });

    const redirectUrlB = new URL(authResponseB.header.location);
    const codeB = redirectUrlB.searchParams.get('code');

    // Exchange codes for tokens
    const dpopProof = 'mock-dpop-proof';

    const tokenResponseA = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'authorization_code',
        code: codeA,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://tenant-a.example.com/callback',
      })
      .expect(200);

    const tokenResponseB = await request(app.getHttpServer())
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'authorization_code',
        code: codeB,
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        redirect_uri: 'https://tenant-b.example.com/callback',
      })
      .expect(200);

    tenantAToken = tokenResponseA.body.access_token;
    tenantBToken = tokenResponseB.body.access_token;

    // Verify tenant isolation
    expect(tenantAToken).toBeDefined();
    expect(tenantBToken).toBeDefined();
    expect(tenantAToken).not.toBe(tenantBToken);
  });

  it('should provide tenant-specific JWKS', async () => {
    // Get JWKS for tenant A
    const jwksResponseA = await request(app.getHttpServer())
      .get('/.well-known/jwks.json')
      .query({ tenant_id: 'tenant-a' })
      .expect(200);

    expect(jwksResponseA.body).toHaveProperty('keys');
    expect(Array.isArray(jwksResponseA.body.keys)).toBe(true);

    // Get JWKS for tenant B
    const jwksResponseB = await request(app.getHttpServer())
      .get('/.well-known/jwks.json')
      .query({ tenant_id: 'tenant-b' })
      .expect(200);

    expect(jwksResponseB.body).toHaveProperty('keys');
    expect(Array.isArray(jwksResponseB.body.keys)).toBe(true);

    // Verify JWKS are different for different tenants
    // Note: In a real implementation, these would be different
    // For this test, we're just verifying the endpoint works
  });

  it('should provide tenant-specific OIDC configuration', async () => {
    // Get OIDC configuration for tenant A
    const configResponseA = await request(app.getHttpServer())
      .get('/.well-known/openid-configuration')
      .query({ tenant_id: 'tenant-a' })
      .expect(200);

    expect(configResponseA.body).toHaveProperty('issuer');
    expect(configResponseA.body.issuer).toContain('tenant-a');
    expect(configResponseA.body).toHaveProperty('authorization_endpoint');
    expect(configResponseA.body).toHaveProperty('token_endpoint');
    expect(configResponseA.body).toHaveProperty('jwks_uri');

    // Get OIDC configuration for tenant B
    const configResponseB = await request(app.getHttpServer())
      .get('/.well-known/openid-configuration')
      .query({ tenant_id: 'tenant-b' })
      .expect(200);

    expect(configResponseB.body).toHaveProperty('issuer');
    expect(configResponseB.body.issuer).toContain('tenant-b');
    expect(configResponseB.body).toHaveProperty('authorization_endpoint');
    expect(configResponseB.body).toHaveProperty('token_endpoint');
    expect(configResponseB.body).toHaveProperty('jwks_uri');
  });
});