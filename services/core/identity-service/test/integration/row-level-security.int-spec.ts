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
import { Rfc7807Exception } from '../../src/exceptions/rfc7807.exception';

describe('Row Level Security Integration', () => {
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

  it('should enforce tenant isolation for user queries', async () => {
    // Create users from different tenants
    const tenantAUser = {
      tenant_id: 'tenant-a',
      username: 'user-a@example.com',
      email: 'user-a@example.com',
      status: 'ACTIVE',
    };

    const tenantBUser = {
      tenant_id: 'tenant-b',
      username: 'user-b@example.com',
      email: 'user-b@example.com',
      status: 'ACTIVE',
    };

    // Create users in the database
    await request(app.getHttpServer())
      .post('/users')
      .send(tenantAUser)
      .expect(201);

    await request(app.getHttpServer())
      .post('/users')
      .send(tenantBUser)
      .expect(201);

    // Verify that tenant A user cannot access tenant B user data
    const tenantAResponse = await request(app.getHttpServer())
      .get('/users')
      .set('X-Tenant-ID', 'tenant-a')
      .expect(200);

    expect(tenantAResponse.body).toHaveLength(1);
    expect(tenantAResponse.body[0].email).toBe('user-a@example.com');

    // Verify that tenant B user cannot access tenant A user data
    const tenantBResponse = await request(app.getHttpServer())
      .get('/users')
      .set('X-Tenant-ID', 'tenant-b')
      .expect(200);

    expect(tenantBResponse.body).toHaveLength(1);
    expect(tenantBResponse.body[0].email).toBe('user-b@example.com');
  });

  it('should enforce tenant isolation for session queries', async () => {
    // Create sessions for users from different tenants
    const tenantASession = {
      user_id: 'user-a-id',
      tenant_id: 'tenant-a',
      device_id: 'device-a',
      cnf_jkt: 'jkt-a',
      issued_at: new Date().toISOString(),
      not_after: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      version: 1,
    };

    const tenantBSession = {
      user_id: 'user-b-id',
      tenant_id: 'tenant-b',
      device_id: 'device-b',
      cnf_jkt: 'jkt-b',
      issued_at: new Date().toISOString(),
      not_after: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      version: 1,
    };

    // Create sessions in the database
    await request(app.getHttpServer())
      .post('/sessions')
      .send(tenantASession)
      .expect(201);

    await request(app.getHttpServer())
      .post('/sessions')
      .send(tenantBSession)
      .expect(201);

    // Verify that tenant A cannot access tenant B session data
    const tenantASessionResponse = await request(app.getHttpServer())
      .get('/sessions')
      .set('X-Tenant-ID', 'tenant-a')
      .expect(200);

    expect(tenantASessionResponse.body).toHaveLength(1);
    expect(tenantASessionResponse.body[0].device_id).toBe('device-a');

    // Verify that tenant B cannot access tenant A session data
    const tenantBSessionResponse = await request(app.getHttpServer())
      .get('/sessions')
      .set('X-Tenant-ID', 'tenant-b')
      .expect(200);

    expect(tenantBSessionResponse.body).toHaveLength(1);
    expect(tenantBSessionResponse.body[0].device_id).toBe('device-b');
  });

  it('should enforce tenant isolation for refresh token queries', async () => {
    // Create refresh tokens for users from different tenants
    const tenantARefreshToken = {
      user_id: 'user-a-id',
      tenant_id: 'tenant-a',
      token_hash: 'hash-a',
      jkt: 'jkt-a',
      kid: 'kid-a',
      jti: 'jti-a',
      family_id: 'family-a',
      client_id: 'client-a',
      device_id: 'device-a',
      session_id: 'session-a',
      scope: 'openid profile',
      expires_at: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
    };

    const tenantBRefreshToken = {
      user_id: 'user-b-id',
      tenant_id: 'tenant-b',
      token_hash: 'hash-b',
      jkt: 'jkt-b',
      kid: 'kid-b',
      jti: 'jti-b',
      family_id: 'family-b',
      client_id: 'client-b',
      device_id: 'device-b',
      session_id: 'session-b',
      scope: 'openid profile',
      expires_at: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
    };

    // Create refresh tokens in the database
    await request(app.getHttpServer())
      .post('/refresh-tokens')
      .send(tenantARefreshToken)
      .expect(201);

    await request(app.getHttpServer())
      .post('/refresh-tokens')
      .send(tenantBRefreshToken)
      .expect(201);

    // Verify that tenant A cannot access tenant B refresh token data
    const tenantARefreshTokenResponse = await request(app.getHttpServer())
      .get('/refresh-tokens')
      .set('X-Tenant-ID', 'tenant-a')
      .expect(200);

    expect(tenantARefreshTokenResponse.body).toHaveLength(1);
    expect(tenantARefreshTokenResponse.body[0].client_id).toBe('client-a');

    // Verify that tenant B cannot access tenant A refresh token data
    const tenantBRefreshTokenResponse = await request(app.getHttpServer())
      .get('/refresh-tokens')
      .set('X-Tenant-ID', 'tenant-b')
      .expect(200);

    expect(tenantBRefreshTokenResponse.body).toHaveLength(1);
    expect(tenantBRefreshTokenResponse.body[0].client_id).toBe('client-b');
  });

  it('should enforce tenant isolation for WebAuthn credential queries', async () => {
    // Create WebAuthn credentials for users from different tenants
    const tenantAWebAuthnCredential = {
      user_id: 'user-a-id',
      credential_id: Buffer.from('credential-a').toString('base64'),
      public_key: Buffer.from('public-key-a').toString('base64'),
      sign_count: 0,
      rp_id: 'localhost',
      origin: 'https://localhost:3000',
    };

    const tenantBWebAuthnCredential = {
      user_id: 'user-b-id',
      credential_id: Buffer.from('credential-b').toString('base64'),
      public_key: Buffer.from('public-key-b').toString('base64'),
      sign_count: 0,
      rp_id: 'localhost',
      origin: 'https://localhost:3000',
    };

    // Create WebAuthn credentials in the database
    await request(app.getHttpServer())
      .post('/webauthn-credentials')
      .send(tenantAWebAuthnCredential)
      .expect(201);

    await request(app.getHttpServer())
      .post('/webauthn-credentials')
      .send(tenantBWebAuthnCredential)
      .expect(201);

    // Verify that tenant A cannot access tenant B WebAuthn credential data
    const tenantAWebAuthnCredentialResponse = await request(app.getHttpServer())
      .get('/webauthn-credentials')
      .set('X-Tenant-ID', 'tenant-a')
      .expect(200);

    expect(tenantAWebAuthnCredentialResponse.body).toHaveLength(1);
    expect(tenantAWebAuthnCredentialResponse.body[0].credential_id).toBe(
      Buffer.from('credential-a').toString('base64'),
    );

    // Verify that tenant B cannot access tenant A WebAuthn credential data
    const tenantBWebAuthnCredentialResponse = await request(app.getHttpServer())
      .get('/webauthn-credentials')
      .set('X-Tenant-ID', 'tenant-b')
      .expect(200);

    expect(tenantBWebAuthnCredentialResponse.body).toHaveLength(1);
    expect(tenantBWebAuthnCredentialResponse.body[0].credential_id).toBe(
      Buffer.from('credential-b').toString('base64'),
    );
  });

  it('should enforce tenant isolation for revocation event queries', async () => {
    // Create revocation events for users from different tenants
    const tenantARevocationEvent = {
      type: 'SESSION',
      subject: 'user-a-id',
      tenant_id: 'tenant-a',
      not_before: new Date().toISOString(),
    };

    const tenantBRevocationEvent = {
      type: 'SESSION',
      subject: 'user-b-id',
      tenant_id: 'tenant-b',
      not_before: new Date().toISOString(),
    };

    // Create revocation events in the database
    await request(app.getHttpServer())
      .post('/revocation-events')
      .send(tenantARevocationEvent)
      .expect(201);

    await request(app.getHttpServer())
      .post('/revocation-events')
      .send(tenantBRevocationEvent)
      .expect(201);

    // Verify that tenant A cannot access tenant B revocation event data
    const tenantARevocationEventResponse = await request(app.getHttpServer())
      .get('/revocation-events')
      .set('X-Tenant-ID', 'tenant-a')
      .expect(200);

    expect(tenantARevocationEventResponse.body).toHaveLength(1);
    expect(tenantARevocationEventResponse.body[0].subject).toBe('user-a-id');

    // Verify that tenant B cannot access tenant A revocation event data
    const tenantBRevocationEventResponse = await request(app.getHttpServer())
      .get('/revocation-events')
      .set('X-Tenant-ID', 'tenant-b')
      .expect(200);

    expect(tenantBRevocationEventResponse.body).toHaveLength(1);
    expect(tenantBRevocationEventResponse.body[0].subject).toBe('user-b-id');
  });

  it('should enforce tenant isolation for signing key queries', async () => {
    // Create signing keys for different tenants
    const tenantASigningKey = {
      tenant_id: 'tenant-a',
      kid: 'kid-a',
      algorithm: 'ES256',
      public_key_jwk: {
        kty: 'EC',
        use: 'sig',
        crv: 'P-256',
        alg: 'ES256',
        x: 'x-coordinate-a',
        y: 'y-coordinate-a',
      },
      private_key_pem: '-----BEGIN PRIVATE KEY-----\nprivate-key-a\n-----END PRIVATE KEY-----',
      status: 'ACTIVE',
      expires_at: new Date(Date.now() + 7776000000).toISOString(), // 90 days from now
    };

    const tenantBSigningKey = {
      tenant_id: 'tenant-b',
      kid: 'kid-b',
      algorithm: 'ES256',
      public_key_jwk: {
        kty: 'EC',
        use: 'sig',
        crv: 'P-256',
        alg: 'ES256',
        x: 'x-coordinate-b',
        y: 'y-coordinate-b',
      },
      private_key_pem: '-----BEGIN PRIVATE KEY-----\nprivate-key-b\n-----END PRIVATE KEY-----',
      status: 'ACTIVE',
      expires_at: new Date(Date.now() + 7776000000).toISOString(), // 90 days from now
    };

    // Create signing keys in the database
    await request(app.getHttpServer())
      .post('/signing-keys')
      .send(tenantASigningKey)
      .expect(201);

    await request(app.getHttpServer())
      .post('/signing-keys')
      .send(tenantBSigningKey)
      .expect(201);

    // Verify that tenant A cannot access tenant B signing key data
    const tenantASigningKeyResponse = await request(app.getHttpServer())
      .get('/signing-keys')
      .set('X-Tenant-ID', 'tenant-a')
      .expect(200);

    expect(tenantASigningKeyResponse.body).toHaveLength(1);
    expect(tenantASigningKeyResponse.body[0].kid).toBe('kid-a');

    // Verify that tenant B cannot access tenant A signing key data
    const tenantBSigningKeyResponse = await request(app.getHttpServer())
      .get('/signing-keys')
      .set('X-Tenant-ID', 'tenant-b')
      .expect(200);

    expect(tenantBSigningKeyResponse.body).toHaveLength(1);
    expect(tenantBSigningKeyResponse.body[0].kid).toBe('kid-b');
  });

  it('should prevent cross-tenant data access attempts', async () => {
    // Create a user in tenant A
    const tenantAUser = {
      tenant_id: 'tenant-a',
      username: 'user-a@example.com',
      email: 'user-a@example.com',
      status: 'ACTIVE',
    };

    await request(app.getHttpServer())
      .post('/users')
      .send(tenantAUser)
      .expect(201);

    // Attempt to access tenant A user data from tenant B (should be blocked)
    const tenantBCrossAccessResponse = await request(app.getHttpServer())
      .get('/users')
      .set('X-Tenant-ID', 'tenant-b')
      .expect(200);

    // Should return empty array since tenant B has no users
    expect(tenantBCrossAccessResponse.body).toHaveLength(0);

    // Attempt to access a specific user from tenant B (should return 404)
    await request(app.getHttpServer())
      .get('/users/user-a-id')
      .set('X-Tenant-ID', 'tenant-b')
      .expect(404);
  });

  it('should return RFC 7807 formatted errors for RLS violations', async () => {
    // Attempt to access data without proper tenant isolation headers
    const response = await request(app.getHttpServer())
      .get('/users')
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toHaveProperty('type');
    expect(response.body.type).toBe('https://smartedify.global/problems/bad-request');
    expect(response.body).toHaveProperty('title');
    expect(response.body.title).toBe('Bad Request');
    expect(response.body).toHaveProperty('status');
    expect(response.body.status).toBe(400);
    expect(response.body).toHaveProperty('detail');
    expect(response.body.detail).toContain('Tenant ID is required');
    expect(response.body).toHaveProperty('instance');
    expect(response.body.instance).toMatch(/^GET \/users/);
  });

  it('should properly handle tenant switching scenarios', async () => {
    // Create users in multiple tenants
    const tenantAUser = {
      tenant_id: 'tenant-a',
      username: 'switch-user-a@example.com',
      email: 'switch-user-a@example.com',
      status: 'ACTIVE',
    };

    const tenantBUser = {
      tenant_id: 'tenant-b',
      username: 'switch-user-b@example.com',
      email: 'switch-user-b@example.com',
      status: 'ACTIVE',
    };

    const tenantCUser = {
      tenant_id: 'tenant-c',
      username: 'switch-user-c@example.com',
      email: 'switch-user-c@example.com',
      status: 'ACTIVE',
    };

    // Create users in the database
    await request(app.getHttpServer())
      .post('/users')
      .send(tenantAUser)
      .expect(201);

    await request(app.getHttpServer())
      .post('/users')
      .send(tenantBUser)
      .expect(201);

    await request(app.getHttpServer())
      .post('/users')
      .send(tenantCUser)
      .expect(201);

    // Switch to tenant A and verify access
    const tenantAResponse = await request(app.getHttpServer())
      .get('/users')
      .set('X-Tenant-ID', 'tenant-a')
      .expect(200);

    expect(tenantAResponse.body).toHaveLength(1);
    expect(tenantAResponse.body[0].email).toBe('switch-user-a@example.com');

    // Switch to tenant B and verify access
    const tenantBResponse = await request(app.getHttpServer())
      .get('/users')
      .set('X-Tenant-ID', 'tenant-b')
      .expect(200);

    expect(tenantBResponse.body).toHaveLength(1);
    expect(tenantBResponse.body[0].email).toBe('switch-user-b@example.com');

    // Switch to tenant C and verify access
    const tenantCResponse = await request(app.getHttpServer())
      .get('/users')
      .set('X-Tenant-ID', 'tenant-c')
      .expect(200);

    expect(tenantCResponse.body).toHaveLength(1);
    expect(tenantCResponse.body[0].email).toBe('switch-user-c@example.com');
  });
});