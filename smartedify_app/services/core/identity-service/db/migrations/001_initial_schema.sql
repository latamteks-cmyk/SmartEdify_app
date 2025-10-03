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
    tenant_id UUID NOT NULL,
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

-- Tabla: dpop_replay_proofs (NUEVA)
CREATE TABLE dpop_replay_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    jkt TEXT NOT NULL,
    jti TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, jkt, jti)
);

-- =============================================================
-- Context function and Row Level Security configuration
-- =============================================================

CREATE OR REPLACE FUNCTION app_current_tenant()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tenant_setting TEXT;
BEGIN
  tenant_setting := current_setting('app.tenant_id', true);
  IF tenant_setting IS NULL OR tenant_setting = '' THEN
    RETURN NULL;
  END IF;
  RETURN tenant_setting::uuid;
END;
$$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE revocation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpop_replay_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = app_current_tenant());

CREATE POLICY sessions_tenant_isolation ON sessions
  USING (tenant_id = app_current_tenant());

CREATE POLICY refresh_tokens_tenant_isolation ON refresh_tokens
  USING (tenant_id = app_current_tenant());

CREATE POLICY webauthn_credentials_tenant_isolation ON webauthn_credentials
  USING ((SELECT tenant_id FROM users WHERE id = user_id) = app_current_tenant());

CREATE POLICY revocation_events_tenant_isolation ON revocation_events
  USING (tenant_id = app_current_tenant());

CREATE POLICY consent_audits_tenant_isolation ON consent_audits
  USING ((SELECT tenant_id FROM users WHERE id = user_id) = app_current_tenant());

CREATE POLICY dpop_replay_proofs_tenant_isolation ON dpop_replay_proofs
  USING (tenant_id = app_current_tenant());
