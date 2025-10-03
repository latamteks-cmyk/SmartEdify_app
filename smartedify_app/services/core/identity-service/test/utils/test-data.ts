// Test utilities for identity-service
import { User } from '../../src/modules/users/entities/user.entity';
import { RefreshToken } from '../../src/modules/tokens/entities/refresh-token.entity';
import { Session } from '../../src/modules/sessions/entities/session.entity';
import { WebAuthnCredential } from '../../src/modules/webauthn/entities/webauthn-credential.entity';

// Seed data for tests
export const createTestUser = (overrides = {}): User => {
  return {
    id: 'test-user-id',
    tenant_id: 'test-tenant-id',
    username: 'testuser@example.com',
    email: 'testuser@example.com',
    phone: '+1234567890',
    status: 'ACTIVE',
    email_verified_at: new Date(),
    phone_verified_at: new Date(),
    preferred_login: 'WEBAUTHN',
    created_at: new Date(),
    updated_at: new Date(),
    password: '$2a$10$8K1p/a0SI9Sjk4JUsLkDneq47J6j8YMTGqt0Z5.m0Rr7o8B8z3N3a', // bcrypt hash of 'password'
    mfa_secret: null,
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    hasPassword: true,
    hasMfaEnabled: false,
    ...overrides,
  } as User;
};

export const createTestRefreshToken = (overrides = {}): RefreshToken => {
  return {
    id: 'test-refresh-token-id',
    token_hash: 'test-token-hash',
    jkt: 'test-jkt-thumbprint',
    kid: 'test-kid',
    jti: 'test-jti',
    family_id: 'test-family-id',
    client_id: 'test-client-id',
    device_id: 'test-device-id',
    session_id: 'test-session-id',
    scope: 'openid profile',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    created_at: new Date(),
    created_ip: '127.0.0.1',
    created_ua: 'test-user-agent',
    revoked: false,
    user: createTestUser(),
    ...overrides,
  } as RefreshToken;
};

export const createTestSession = (overrides = {}): Session => {
  return {
    id: 'test-session-id',
    tenant_id: 'test-tenant-id',
    device_id: 'test-device-id',
    cnf_jkt: 'test-jkt-thumbprint',
    issued_at: new Date(),
    not_after: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    version: 1,
    created_at: new Date(),
    user: createTestUser(),
    ...overrides,
  } as Session;
};

export const createTestWebAuthnCredential = (overrides = {}): WebAuthnCredential => {
  return {
    id: 'test-credential-id',
    credential_id: Buffer.from('test-credential-id'),
    public_key: Buffer.from('test-public-key'),
    sign_count: 0,
    rp_id: 'localhost',
    origin: 'https://localhost:3000',
    created_at: new Date(),
    user: createTestUser(),
    ...overrides,
  } as WebAuthnCredential;
};

// Mock tenant validation
export const mockTenantValidation = () => {
  return {
    status: 200,
    data: { id: 'test-tenant-id', name: 'Test Tenant' },
  };
};

// Test database configuration
export const testDbConfig = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  username: process.env.DB_USERNAME || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_TEST_DATABASE || 'identity_test_db',
  entities: [
    User,
    WebAuthnCredential,
    RefreshToken,
    Session,
  ],
  synchronize: true, // Enable for tests
  dropSchema: true, // Clear schema for each test
  logging: false,
};