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
import { seedUsers } from '../utils/seed-data';

describe('Database Query Optimization Integration', () => {
  let app: INestApplication;
  let userRepository: any;
  let sessionRepository: any;
  let refreshTokenRepository: any;
  let webAuthnCredentialRepository: any;
  let revocationEventRepository: any;

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

    // Get repositories
    userRepository = moduleFixture.get('UserRepository');
    sessionRepository = moduleFixture.get('SessionRepository');
    refreshTokenRepository = moduleFixture.get('RefreshTokenRepository');
    webAuthnCredentialRepository = moduleFixture.get('WebAuthnCredentialRepository');
    revocationEventRepository = moduleFixture.get('RevocationEventRepository');

    // Seed database with test data
    for (const userData of seedUsers) {
      const user = userRepository.create(userData);
      await userRepository.save(user);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should have optimized indexes on user table', async () => {
    // Check that indexes exist on user table
    const indexes = await userRepository.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'users'
    `);
    
    // Verify email index exists
    const emailIndex = indexes.find((idx: any) => idx.indexname === 'IDX_users_email');
    expect(emailIndex).toBeDefined();
    
    // Verify tenant_id + status index exists
    const tenantStatusIndex = indexes.find((idx: any) => idx.indexname === 'IDX_users_tenant_status');
    expect(tenantStatusIndex).toBeDefined();
    
    // Verify username index exists
    const usernameIndex = indexes.find((idx: any) => idx.indexname === 'IDX_users_username');
    expect(usernameIndex).toBeDefined();
  });

  it('should have optimized indexes on session table', async () => {
    // Check that indexes exist on session table
    const indexes = await sessionRepository.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'sessions'
    `);
    
    // Verify revoked sessions index exists
    const revokedIndex = indexes.find((idx: any) => idx.indexname === 'IDX_sessions_revoked');
    expect(revokedIndex).toBeDefined();
    
    // Verify valid sessions index exists
    const validIndex = indexes.find((idx: any) => idx.indexname === 'IDX_sessions_valid');
    expect(validIndex).toBeDefined();
    
    // Verify user active sessions index exists
    const userActiveIndex = indexes.find((idx: any) => idx.indexname === 'IDX_sessions_user_active');
    expect(userActiveIndex).toBeDefined();
  });

  it('should have optimized indexes on refresh token table', async () => {
    // Check that indexes exist on refresh token table
    const indexes = await refreshTokenRepository.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'refresh_tokens'
    `);
    
    // Verify revoked refresh tokens index exists
    const revokedIndex = indexes.find((idx: any) => idx.indexname === 'IDX_refresh_tokens_revoked');
    expect(revokedIndex).toBeDefined();
    
    // Verify expired refresh tokens index exists
    const expiredIndex = indexes.find((idx: any) => idx.indexname === 'IDX_refresh_tokens_expired');
    expect(expiredIndex).toBeDefined();
    
    // Verify family active refresh tokens index exists
    const familyActiveIndex = indexes.find((idx: any) => idx.indexname === 'IDX_refresh_tokens_family_active');
    expect(familyActiveIndex).toBeDefined();
    
    // Verify hash active refresh tokens index exists
    const hashActiveIndex = indexes.find((idx: any) => idx.indexname === 'IDX_refresh_tokens_hash_active');
    expect(hashActiveIndex).toBeDefined();
  });

  it('should have optimized indexes on WebAuthn credential table', async () => {
    // Check that indexes exist on WebAuthn credential table
    const indexes = await webAuthnCredentialRepository.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'webauthn_credentials'
    `);
    
    // Verify credential_id index exists
    const credentialIdIndex = indexes.find((idx: any) => idx.indexname === 'IDX_webauthn_credentials_credential_id');
    expect(credentialIdIndex).toBeDefined();
    
    // Verify user active credentials index exists
    const userActiveIndex = indexes.find((idx: any) => idx.indexname === 'IDX_webauthn_credentials_user_active');
    expect(userActiveIndex).toBeDefined();
  });

  it('should have optimized indexes on revocation event table', async () => {
    // Check that indexes exist on revocation event table
    const indexes = await revocationEventRepository.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'revocation_events'
    `);
    
    // Verify subject check index exists
    const subjectCheckIndex = indexes.find((idx: any) => idx.indexname === 'IDX_revocation_events_subject_check');
    expect(subjectCheckIndex).toBeDefined();
    
    // Verify recent events index exists
    const recentIndex = indexes.find((idx: any) => idx.indexname === 'IDX_revocation_events_recent');
    expect(recentIndex).toBeDefined();
  });

  it('should have foreign key constraints for better query planning', async () => {
    // Check that foreign key constraints exist
    const constraints = await userRepository.query(`
      SELECT conname, conrelid::regclass AS table_from, 
             confrelid::regclass AS table_to, conkey, confkey
      FROM pg_constraint 
      WHERE contype = 'f' 
      AND conrelid::regclass IN ('users', 'sessions', 'refresh_tokens', 'webauthn_credentials')
    `);
    
    // Verify sessions.user_id foreign key exists
    const sessionsFk = constraints.find((constraint: any) => 
      constraint.table_from === 'sessions' && constraint.table_to === 'users'
    );
    expect(sessionsFk).toBeDefined();
    
    // Verify refresh_tokens.user_id foreign key exists
    const refreshTokenFk = constraints.find((constraint: any) => 
      constraint.table_from === 'refresh_tokens' && constraint.table_to === 'users'
    );
    expect(refreshTokenFk).toBeDefined();
    
    // Verify webauthn_credentials.user_id foreign key exists
    const webAuthnFk = constraints.find((constraint: any) => 
      constraint.table_from === 'webauthn_credentials' && constraint.table_to === 'users'
    );
    expect(webAuthnFk).toBeDefined();
  });

  it('should perform optimized queries for user lookups', async () => {
    // Measure query performance for email lookup
    const startTime = process.hrtime.bigint();
    const user = await userRepository.findOne({
      where: { email: 'user1@example.com' }
    });
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    expect(user).toBeDefined();
    expect(user.email).toBe('user1@example.com');
    // Verify query is fast (under 10ms)
    expect(duration).toBeLessThan(10);
  });

  it('should perform optimized queries for session lookups', async () => {
    // Create a test session
    const user = await userRepository.findOne({
      where: { email: 'user1@example.com' }
    });
    
    const session = sessionRepository.create({
      user: user,
      tenant_id: user.tenant_id,
      device_id: 'test-device-id',
      cnf_jkt: 'test-jkt',
      issued_at: new Date(),
      not_after: new Date(Date.now() + 3600000), // 1 hour from now
      version: 1,
    });
    await sessionRepository.save(session);
    
    // Measure query performance for active sessions lookup
    const startTime = process.hrtime.bigint();
    const activeSessions = await sessionRepository.find({
      where: {
        user: { id: user.id },
        revoked_at: null,
        not_after: { $gt: new Date() }
      }
    });
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    expect(activeSessions).toBeDefined();
    expect(Array.isArray(activeSessions)).toBe(true);
    // Verify query is fast (under 10ms)
    expect(duration).toBeLessThan(10);
  });

  it('should perform optimized queries for refresh token lookups', async () => {
    // Create a test refresh token
    const user = await userRepository.findOne({
      where: { email: 'user1@example.com' }
    });
    
    const refreshToken = refreshTokenRepository.create({
      user: user,
      token_hash: 'test-token-hash',
      jkt: 'test-jkt',
      kid: 'test-kid',
      jti: 'test-jti',
      family_id: 'test-family-id',
      client_id: 'test-client-id',
      device_id: 'test-device-id',
      session_id: 'test-session-id',
      scope: 'openid profile',
      expires_at: new Date(Date.now() + 2592000000), // 30 days from now
    });
    await refreshTokenRepository.save(refreshToken);
    
    // Measure query performance for active refresh token lookup
    const startTime = process.hrtime.bigint();
    const activeRefreshToken = await refreshTokenRepository.findOne({
      where: {
        token_hash: 'test-token-hash',
        revoked: false,
        expires_at: { $gt: new Date() }
      }
    });
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    expect(activeRefreshToken).toBeDefined();
    expect(activeRefreshToken.token_hash).toBe('test-token-hash');
    // Verify query is fast (under 10ms)
    expect(duration).toBeLessThan(10);
  });

  it('should perform optimized queries for WebAuthn credential lookups', async () => {
    // Create a test WebAuthn credential
    const user = await userRepository.findOne({
      where: { email: 'user1@example.com' }
    });
    
    const webAuthnCredential = webAuthnCredentialRepository.create({
      user: user,
      credential_id: Buffer.from('test-credential-id'),
      public_key: Buffer.from('test-public-key'),
      sign_count: 0,
      rp_id: 'localhost',
      origin: 'https://localhost:3000',
    });
    await webAuthnCredentialRepository.save(webAuthnCredential);
    
    // Measure query performance for credential lookup
    const startTime = process.hrtime.bigint();
    const credential = await webAuthnCredentialRepository.findOne({
      where: {
        credential_id: Buffer.from('test-credential-id')
      }
    });
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    expect(credential).toBeDefined();
    expect(credential.credential_id.toString()).toBe('test-credential-id');
    // Verify query is fast (under 10ms)
    expect(duration).toBeLessThan(10);
  });

  it('should perform optimized queries for revocation event lookups', async () => {
    // Create a test revocation event
    const user = await userRepository.findOne({
      where: { email: 'user1@example.com' }
    });
    
    const revocationEvent = revocationEventRepository.create({
      type: 'USER_LOGOUT',
      subject: user.id,
      tenant_id: user.tenant_id,
      not_before: new Date(),
    });
    await revocationEventRepository.save(revocationEvent);
    
    // Measure query performance for recent events lookup
    const startTime = process.hrtime.bigint();
    const recentEvents = await revocationEventRepository.find({
      where: {
        subject: user.id,
        tenant_id: user.tenant_id,
        not_before: { $lt: new Date() }
      },
      order: {
        created_at: 'DESC'
      },
      take: 10
    });
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    expect(recentEvents).toBeDefined();
    expect(Array.isArray(recentEvents)).toBe(true);
    // Verify query is fast (under 10ms)
    expect(duration).toBeLessThan(10);
  });
});