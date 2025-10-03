// Test factories for creating complex test objects with consistent structure
import { User } from '../../src/modules/users/entities/user.entity';
import { RefreshToken } from '../../src/modules/tokens/entities/refresh-token.entity';
import { Session } from '../../src/modules/sessions/entities/session.entity';
import { WebAuthnCredential } from '../../src/modules/webauthn/entities/webauthn-credential.entity';
import { SigningKey } from '../../src/modules/keys/entities/signing-key.entity';
import { ConsentAudit } from '../../src/modules/users/entities/consent-audit.entity';

// Factory for creating User entities with realistic data
export const createUserFactory = (overrides = {}) => {
  const userData = {
    id: 'test-user-id-' + Math.random().toString(36).substr(2, 9),
    tenant_id: 'test-tenant-id-' + Math.random().toString(36).substr(2, 9),
    username: `testuser.${Math.random().toString(36).substr(2, 5)}@example.com`,
    email: `testuser.${Math.random().toString(36).substr(2, 5)}@example.com`,
    phone: '+1234567890',
    status: 'ACTIVE',
    email_verified_at: new Date(),
    phone_verified_at: new Date(),
    preferred_login: 'WEBAUTHN',
    created_at: new Date(),
    updated_at: new Date(),
    password: '$2a$10$8K1p/a0SI9Sjk4JUsLkDneq47J6j8YMTGqt0Z5.m0Rr7o8B8z3N3a', // bcrypt hash of 'password'
    mfa_secret: null,
    ...overrides,
  };

  const user = new User();
  Object.assign(user, userData);
  return user;
};

// Factory for creating RefreshToken entities
export const createRefreshTokenFactory = (overrides = {}) => {
  const refreshTokenData = {
    id: 'test-refresh-token-id-' + Math.random().toString(36).substr(2, 9),
    token_hash: 'test-token-hash-' + Math.random().toString(36).substr(2, 9),
    jkt: 'test-jkt-thumbprint-' + Math.random().toString(36).substr(2, 9),
    kid: 'test-kid-' + Math.random().toString(36).substr(2, 9),
    jti: 'test-jti-' + Math.random().toString(36).substr(2, 9),
    family_id: 'test-family-id-' + Math.random().toString(36).substr(2, 9),
    client_id: 'test-client-id-' + Math.random().toString(36).substr(2, 9),
    device_id: 'test-device-id-' + Math.random().toString(36).substr(2, 9),
    session_id: 'test-session-id-' + Math.random().toString(36).substr(2, 9),
    scope: 'openid profile',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    created_at: new Date(),
    created_ip: '127.0.0.1',
    created_ua: 'test-user-agent',
    revoked: false,
    user: createUserFactory(),
    ...overrides,
  };

  const refreshToken = new RefreshToken();
  Object.assign(refreshToken, refreshTokenData);
  return refreshToken;
};

// Factory for creating Session entities
export const createSessionFactory = (overrides = {}) => {
  const sessionData = {
    id: 'test-session-id-' + Math.random().toString(36).substr(2, 9),
    tenant_id: 'test-tenant-id-' + Math.random().toString(36).substr(2, 9),
    device_id: 'test-device-id-' + Math.random().toString(36).substr(2, 9),
    cnf_jkt: 'test-jkt-thumbprint-' + Math.random().toString(36).substr(2, 9),
    issued_at: new Date(),
    not_after: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    version: 1,
    created_at: new Date(),
    user: createUserFactory(),
    ...overrides,
  };

  const session = new Session();
  Object.assign(session, sessionData);
  return session;
};

// Factory for creating WebAuthnCredential entities
export const createWebAuthnCredentialFactory = (overrides = {}) => {
  const credentialData = {
    id: 'test-credential-id-' + Math.random().toString(36).substr(2, 9),
    credential_id: Buffer.from('test-credential-id-' + Math.random().toString(36).substr(2, 9)),
    public_key: Buffer.from('test-public-key-' + Math.random().toString(36).substr(2, 9)),
    sign_count: 0,
    rp_id: 'localhost',
    origin: 'https://localhost:3000',
    created_at: new Date(),
    user: createUserFactory(),
    ...overrides,
  };

  const credential = new WebAuthnCredential();
  Object.assign(credential, credentialData);
  return credential;
};

// Factory for creating SigningKey entities
export const createSigningKeyFactory = (overrides = {}) => {
  const keyData = {
    id: 'test-signing-key-id-' + Math.random().toString(36).substr(2, 9),
    tenant_id: 'test-tenant-id-' + Math.random().toString(36).substr(2, 9),
    kid: 'test-kid-' + Math.random().toString(36).substr(2, 9),
    algorithm: 'ES256',
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    public_key_jwk: {
      kty: 'EC',
      use: 'sig',
      crv: 'P-256',
      alg: 'ES256',
      x: 'test-x-coordinate',
      y: 'test-y-coordinate',
    },
    private_key_pem: '-----BEGIN PRIVATE KEY-----\ntest-private-key\n-----END PRIVATE KEY-----',
    ...overrides,
  };

  const key = new SigningKey();
  Object.assign(key, keyData);
  return key;
};

// Factory for creating ConsentAudit entities
export const createConsentAuditFactory = (overrides = {}) => {
  const consentData = {
    id: 'test-consent-id-' + Math.random().toString(36).substr(2, 9),
    consent_type: 'terms_of_service',
    consent_granted: true,
    granted_at: new Date(),
    ip_address: '127.0.0.1',
    user_agent: 'test-user-agent',
    policy_version: '1.0.0',
    purpose: 'authentication',
    country_code: 'US',
    evidence_ref: 'evidence-ref-' + Math.random().toString(36).substr(2, 9),
    user: createUserFactory(),
    ...overrides,
  };

  const consent = new ConsentAudit();
  Object.assign(consent, consentData);
  return consent;
};

// Factory for creating complete test scenarios
export const createTestScenario = (overrides = {}) => {
  const user = createUserFactory();
  const session = createSessionFactory({ user });
  const refreshToken = createRefreshTokenFactory({ user });
  const credential = createWebAuthnCredentialFactory({ user });
  const signingKey = createSigningKeyFactory({ tenant_id: user.tenant_id });

  return {
    user,
    session,
    refreshToken,
    credential,
    signingKey,
    ...overrides,
  };
};