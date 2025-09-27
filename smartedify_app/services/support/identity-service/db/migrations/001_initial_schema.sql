-- Tabla: users (¡CORREGIDO!)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, LOCKED
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    preferred_login TEXT, -- 'PASSWORD', 'TOTP', 'WEBAUTHN'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, username),
    UNIQUE(tenant_id, email)
);

-- Tabla: webauthn_credentials (¡CORREGIDO!)
CREATE TABLE webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    credential_id BYTEA NOT NULL,
    public_key BYTEA NOT NULL,
    sign_count BIGINT NOT NULL DEFAULT 0,
    rp_id TEXT NOT NULL,
    origin TEXT NOT NULL,
    aaguid BYTEA,
    attestation_fmt TEXT,
    transports TEXT[],
    backup_eligible BOOLEAN,
    backup_state TEXT,
    cred_protect TEXT,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, credential_id)
);

-- Tabla: refresh_tokens (¡CORREGIDO!)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    jkt TEXT NOT NULL,
    family_id UUID NOT NULL,
    parent_id UUID REFERENCES refresh_tokens(id),
    replaced_by_id UUID REFERENCES refresh_tokens(id),
    used_at TIMESTAMPTZ,
    client_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    session_id UUID NOT NULL,
    scope TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_ip TEXT,
    created_ua TEXT,
    revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: sessions (¡NUEVA! ¡CORREGIDO!)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tenant_id UUID NOT NULL,
    device_id TEXT NOT NULL,
    cnf_jkt TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    not_after TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: consent_audits (¡CORREGIDO!)
CREATE TABLE consent_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    consent_type TEXT NOT NULL,
    consent_granted BOOLEAN NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    policy_version TEXT,
    purpose TEXT,
    country_code TEXT,
    evidence_ref TEXT
);

-- Tabla: revocation_events (¡NUEVA! ¡CORREGIDO!)
CREATE TABLE revocation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    subject UUID NOT NULL,
    tenant_id UUID NOT NULL,
    session_id UUID,
    jti TEXT,
    not_before TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
