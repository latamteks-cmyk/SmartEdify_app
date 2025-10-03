import { User } from '../../src/modules/users/entities/user.entity';
import { RefreshToken } from '../../src/modules/tokens/entities/refresh-token.entity';
import { Session } from '../../src/modules/sessions/entities/session.entity';
import { WebAuthnCredential } from '../../src/modules/webauthn/entities/webauthn-credential.entity';
import { RevocationEvent } from '../../src/modules/sessions/entities/revocation-event.entity';

// Seed data for 5 example users as specified in the task
export const seedUsers: Partial<User>[] = [
  {
    tenant_id: 'tenant-a',
    username: 'user1@example.com',
    email: 'user1@example.com',
    status: 'ACTIVE',
    email_verified_at: new Date(),
    phone_verified_at: new Date(),
    preferred_login: 'WEBAUTHN',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    tenant_id: 'tenant-b',
    username: 'user2@example.com',
    email: 'user2@example.com',
    status: 'ACTIVE',
    email_verified_at: new Date(),
    phone_verified_at: new Date(),
    preferred_login: 'TOTP',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    tenant_id: 'tenant-c',
    username: 'user3@example.com',
    email: 'user3@example.com',
    status: 'ACTIVE',
    email_verified_at: new Date(),
    phone_verified_at: new Date(),
    preferred_login: 'PASSWORD',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    tenant_id: 'tenant-a',
    username: 'user4@example.com',
    email: 'user4@example.com',
    status: 'INACTIVE',
    email_verified_at: new Date(),
    phone_verified_at: new Date(),
    preferred_login: 'WEBAUTHN',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    tenant_id: 'tenant-b',
    username: 'user5@example.com',
    email: 'user5@example.com',
    status: 'LOCKED',
    email_verified_at: new Date(),
    phone_verified_at: new Date(),
    preferred_login: 'TOTP',
    created_at: new Date(),
    updated_at: new Date(),
  },
];

export const seedWebAuthnCredentials: Partial<WebAuthnCredential>[] = [
  {
    id: 'cred-1',
    user: { id: 'user-1' } as User,
    credential_id: Buffer.from('credential1'),
    public_key: Buffer.from('publicKey1'),
    sign_count: 10,
    rp_id: 'localhost',
    origin: 'https://localhost:3000',
    created_at: new Date(),
  },
  {
    id: 'cred-2',
    user: { id: 'user-2' } as User,
    credential_id: Buffer.from('credential2'),
    public_key: Buffer.from('publicKey2'),
    sign_count: 5,
    rp_id: 'localhost',
    origin: 'https://localhost:3000',
    created_at: new Date(),
  },
  {
    id: 'cred-3',
    user: { id: 'user-3' } as User,
    credential_id: Buffer.from('credential3'),
    public_key: Buffer.from('publicKey3'),
    sign_count: 3,
    rp_id: 'localhost',
    origin: 'https://localhost:3000',
    created_at: new Date(),
  },
  {
    id: 'cred-4',
    user: { id: 'user-4' } as User,
    credential_id: Buffer.from('credential4'),
    public_key: Buffer.from('publicKey4'),
    sign_count: 15,
    rp_id: 'localhost',
    origin: 'https://localhost:3000',
    created_at: new Date(),
  },
  {
    id: 'cred-5',
    user: { id: 'user-5' } as User,
    credential_id: Buffer.from('credential5'),
    public_key: Buffer.from('publicKey5'),
    sign_count: 2,
    rp_id: 'localhost',
    origin: 'https://localhost:3000',
    created_at: new Date(),
  },
];

export const seedSessions: Partial<Session>[] = [
  {
    id: 'session-1',
    user: { id: 'user-1' } as User,
    tenant_id: 'tenant-a',
    device_id: 'device-1',
    cnf_jkt: 'jkt-1',
    issued_at: new Date(Date.now() - 3600000), // 1 hour ago
    not_after: new Date(Date.now() + 3600000), // 1 hour from now
    version: 1,
    created_at: new Date(),
  },
  {
    id: 'session-2',
    user: { id: 'user-2' } as User,
    tenant_id: 'tenant-b',
    device_id: 'device-2',
    cnf_jkt: 'jkt-2',
    issued_at: new Date(Date.now() - 1800000), // 30 minutes ago
    not_after: new Date(Date.now() + 1800000), // 30 minutes from now
    version: 1,
    created_at: new Date(),
  },
  {
    id: 'session-3',
    user: { id: 'user-3' } as User,
    tenant_id: 'tenant-c',
    device_id: 'device-3',
    cnf_jkt: 'jkt-3',
    issued_at: new Date(Date.now() - 7200000), // 2 hours ago
    not_after: new Date(Date.now() + 7200000), // 2 hours from now
    version: 1,
    created_at: new Date(),
  },
  {
    id: 'session-4',
    user: { id: 'user-4' } as User,
    tenant_id: 'tenant-a',
    device_id: 'device-4',
    cnf_jkt: 'jkt-4',
    issued_at: new Date(Date.now() - 900000), // 15 minutes ago
    not_after: new Date(Date.now() + 900000), // 15 minutes from now
    version: 1,
    created_at: new Date(),
  },
  {
    id: 'session-5',
    user: { id: 'user-5' } as User,
    tenant_id: 'tenant-b',
    device_id: 'device-5',
    cnf_jkt: 'jkt-5',
    issued_at: new Date(Date.now() - 10800000), // 3 hours ago
    not_after: new Date(Date.now() + 10800000), // 3 hours from now
    version: 1,
    created_at: new Date(),
  },
];

export const seedRefreshTokens: Partial<RefreshToken>[] = [
  {
    id: 'refresh-token-1',
    token_hash: 'hash1',
    user: { id: 'user-1' } as User,
    jkt: 'jkt-1',
    kid: 'kid-1',
    jti: 'jti-1',
    family_id: 'family-1',
    client_id: 'client-1',
    device_id: 'device-1',
    session_id: 'session-1',
    scope: 'openid profile',
    expires_at: new Date(Date.now() + 2592000000), // 30 days from now
    created_at: new Date(),
  },
  {
    id: 'refresh-token-2',
    token_hash: 'hash2',
    user: { id: 'user-2' } as User,
    jkt: 'jkt-2',
    kid: 'kid-2',
    jti: 'jti-2',
    family_id: 'family-2',
    client_id: 'client-2',
    device_id: 'device-2',
    session_id: 'session-2',
    scope: 'openid profile email',
    expires_at: new Date(Date.now() + 2592000000), // 30 days from now
    created_at: new Date(),
  },
  {
    id: 'refresh-token-3',
    token_hash: 'hash3',
    user: { id: 'user-3' } as User,
    jkt: 'jkt-3',
    kid: 'kid-3',
    jti: 'jti-3',
    family_id: 'family-3',
    client_id: 'client-3',
    device_id: 'device-3',
    session_id: 'session-3',
    scope: 'openid profile email address',
    expires_at: new Date(Date.now() + 2592000000), // 30 days from now
    created_at: new Date(),
  },
  {
    id: 'refresh-token-4',
    token_hash: 'hash4',
    user: { id: 'user-4' } as User,
    jkt: 'jkt-4',
    kid: 'kid-4',
    jti: 'jti-4',
    family_id: 'family-4',
    client_id: 'client-4',
    device_id: 'device-4',
    session_id: 'session-4',
    scope: 'openid',
    expires_at: new Date(Date.now() + 2592000000), // 30 days from now
    created_at: new Date(),
  },
  {
    id: 'refresh-token-5',
    token_hash: 'hash5',
    user: { id: 'user-5' } as User,
    jkt: 'jkt-5',
    kid: 'kid-5',
    jti: 'jti-5',
    family_id: 'family-5',
    client_id: 'client-5',
    device_id: 'device-5',
    session_id: 'session-5',
    scope: 'openid profile',
    expires_at: new Date(Date.now() + 2592000000), // 30 days from now
    created_at: new Date(),
  },
];

export const seedRevocationEvents: Partial<RevocationEvent>[] = [
  {
    id: 'event-1',
    type: 'USER_LOGOUT',
    subject: 'user-1',
    tenant_id: 'tenant-a',
    not_before: new Date(Date.now() - 10000), // 10 seconds ago
    created_at: new Date(),
  },
  {
    id: 'event-2',
    type: 'TOKEN',
    subject: 'user-2',
    tenant_id: 'tenant-b',
    not_before: new Date(Date.now() - 20000), // 20 seconds ago
    created_at: new Date(),
  },
  {
    id: 'event-3',
    type: 'SESSION',
    subject: 'user-3',
    tenant_id: 'tenant-c',
    not_before: new Date(Date.now() - 30000), // 30 seconds ago
    created_at: new Date(),
  },
  {
    id: 'event-4',
    type: 'USER_LOGOUT',
    subject: 'user-4',
    tenant_id: 'tenant-a',
    not_before: new Date(Date.now() - 40000), // 40 seconds ago
    created_at: new Date(),
  },
  {
    id: 'event-5',
    type: 'USER_LOGOUT',
    subject: 'user-5',
    tenant_id: 'tenant-b',
    not_before: new Date(Date.now() - 50000), // 50 seconds ago
    created_at: new Date(),
  },
];
