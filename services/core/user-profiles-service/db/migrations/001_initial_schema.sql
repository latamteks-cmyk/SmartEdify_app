-- Migration: 001_initial_schema.sql
-- Description: Esquema inicial para user-profiles-service
-- Author: SmartEdify Platform Team
-- Date: 2025-09-30

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear esquema para el servicio
CREATE SCHEMA IF NOT EXISTS user_profiles;

-- Configurar RLS por defecto
ALTER DEFAULT PRIVILEGES IN SCHEMA user_profiles GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO application_user;

-- === TABLA PROFILES ===
CREATE TABLE user_profiles.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email TEXT NOT NULL CHECK (char_length(email) <= 254 AND email ~ '^[^@]+@[^@]+\.[^@]+$'),
    phone TEXT CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{7,14}$'),
    full_name TEXT NOT NULL CHECK (char_length(full_name) <= 140 AND char_length(full_name) >= 2),
    status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' 
        CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'LOCKED', 'INACTIVE')),
    country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT profiles_unique_email_per_tenant UNIQUE (tenant_id, email),
    CONSTRAINT profiles_no_deleted_duplicates EXCLUDE (tenant_id WITH =, email WITH =) 
        WHERE (deleted_at IS NULL)
);

-- Índices para profiles
CREATE INDEX idx_profiles_tenant_id ON user_profiles.profiles(tenant_id);
CREATE INDEX idx_profiles_email ON user_profiles.profiles(email);
CREATE INDEX idx_profiles_status ON user_profiles.profiles(status);
CREATE INDEX idx_profiles_created_at ON user_profiles.profiles(created_at);

-- RLS para profiles
ALTER TABLE user_profiles.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_tenant_isolation ON user_profiles.profiles
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- === TABLA MEMBERSHIPS ===
CREATE TABLE user_profiles.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    profile_id UUID NOT NULL REFERENCES user_profiles.profiles(id) ON DELETE CASCADE,
    condominium_id UUID NOT NULL,
    unit_id UUID, -- Referencias a tenancy.units, pero no FK para evitar dependencias circulares
    relation TEXT NOT NULL CHECK (relation IN ('OWNER','TENANT','CONVIVIENTE','STAFF','PROVIDER','VISITOR')),
    tenant_type TEXT CHECK (tenant_type IS NULL OR tenant_type IN ('ARRENDATARIO','CONVIVIENTE')),
    privileges JSONB NOT NULL DEFAULT '{}'::jsonb,
    responsible_profile_id UUID REFERENCES user_profiles.profiles(id),
    since TIMESTAMPTZ NOT NULL DEFAULT now(),
    until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Status computado
    status TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN until IS NULL OR until > now() THEN 'ACTIVE' 
            ELSE 'ENDED' 
        END
    ) STORED,
    
    -- Constraints
    CONSTRAINT memberships_valid_dates CHECK (until IS NULL OR until > since),
    CONSTRAINT memberships_tenant_type_logic CHECK (
        (relation = 'TENANT' AND tenant_type IS NOT NULL) OR 
        (relation != 'TENANT' AND tenant_type IS NULL)
    ),
    CONSTRAINT memberships_responsible_logic CHECK (
        (relation IN ('TENANT', 'CONVIVIENTE') AND responsible_profile_id IS NOT NULL) OR
        (relation NOT IN ('TENANT', 'CONVIVIENTE') AND responsible_profile_id IS NULL)
    )
);

-- Índices para memberships
CREATE INDEX idx_memberships_tenant_id ON user_profiles.memberships(tenant_id);
CREATE INDEX idx_memberships_profile_id ON user_profiles.memberships(profile_id);
CREATE INDEX idx_memberships_condominium_id ON user_profiles.memberships(condominium_id);
CREATE INDEX idx_memberships_unit_id ON user_profiles.memberships(unit_id);
CREATE INDEX idx_memberships_relation ON user_profiles.memberships(relation);
CREATE INDEX idx_memberships_status ON user_profiles.memberships(status);
CREATE INDEX idx_memberships_active ON user_profiles.memberships(tenant_id, condominium_id, profile_id) 
    WHERE status = 'ACTIVE';

-- RLS para memberships
ALTER TABLE user_profiles.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY memberships_tenant_isolation ON user_profiles.memberships
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- === TABLA ROLES ===
CREATE TABLE user_profiles.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    condominium_id UUID NOT NULL,
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT roles_unique_name_per_condo UNIQUE (tenant_id, condominium_id, name),
    CONSTRAINT roles_valid_permissions CHECK (jsonb_typeof(permissions) = 'array')
);

-- Índices para roles
CREATE INDEX idx_roles_tenant_id ON user_profiles.roles(tenant_id);
CREATE INDEX idx_roles_condominium_id ON user_profiles.roles(condominium_id);
CREATE INDEX idx_roles_name ON user_profiles.roles(name);

-- RLS para roles
ALTER TABLE user_profiles.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_tenant_isolation ON user_profiles.roles
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- === TABLA ROLE_ASSIGNMENTS ===
CREATE TABLE user_profiles.role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    profile_id UUID NOT NULL REFERENCES user_profiles.profiles(id) ON DELETE CASCADE,
    condominium_id UUID NOT NULL,
    role_id UUID NOT NULL REFERENCES user_profiles.roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    granted_by UUID REFERENCES user_profiles.profiles(id),
    revoked_by UUID REFERENCES user_profiles.profiles(id),
    
    -- Constraints
    CONSTRAINT role_assignments_valid_dates CHECK (revoked_at IS NULL OR revoked_at > granted_at),
    CONSTRAINT role_assignments_unique_active UNIQUE (profile_id, role_id) 
        DEFERRABLE INITIALLY DEFERRED
);

-- Índices para role_assignments
CREATE INDEX idx_role_assignments_tenant_id ON user_profiles.role_assignments(tenant_id);
CREATE INDEX idx_role_assignments_profile_id ON user_profiles.role_assignments(profile_id);
CREATE INDEX idx_role_assignments_condominium_id ON user_profiles.role_assignments(condominium_id);
CREATE INDEX idx_role_assignments_role_id ON user_profiles.role_assignments(role_id);
CREATE INDEX idx_role_assignments_active ON user_profiles.role_assignments(profile_id, condominium_id) 
    WHERE revoked_at IS NULL;

-- RLS para role_assignments
ALTER TABLE user_profiles.role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_assignments_tenant_isolation ON user_profiles.role_assignments
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- === TABLA PROFILE_ENTITLEMENTS ===
CREATE TABLE user_profiles.profile_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    profile_id UUID NOT NULL REFERENCES user_profiles.profiles(id) ON DELETE CASCADE,
    condominium_id UUID NOT NULL,
    service_code TEXT NOT NULL CHECK (service_code IN ('GOVERNANCE','FINANCE','MAINTENANCE','SECURITY','ANALYTICS')),
    entitlement_key TEXT NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    granted_by UUID REFERENCES user_profiles.profiles(id),
    revoked_by UUID REFERENCES user_profiles.profiles(id),
    
    -- Constraints
    CONSTRAINT entitlements_valid_dates CHECK (revoked_at IS NULL OR revoked_at > granted_at),
    CONSTRAINT entitlements_unique_active UNIQUE (profile_id, condominium_id, service_code, entitlement_key)
        DEFERRABLE INITIALLY DEFERRED
);

-- Índices para profile_entitlements
CREATE INDEX idx_entitlements_tenant_id ON user_profiles.profile_entitlements(tenant_id);
CREATE INDEX idx_entitlements_profile_id ON user_profiles.profile_entitlements(profile_id);
CREATE INDEX idx_entitlements_condominium_id ON user_profiles.profile_entitlements(condominium_id);
CREATE INDEX idx_entitlements_service_code ON user_profiles.profile_entitlements(service_code);
CREATE INDEX idx_entitlements_active ON user_profiles.profile_entitlements(profile_id, condominium_id, service_code) 
    WHERE revoked_at IS NULL;

-- RLS para profile_entitlements
ALTER TABLE user_profiles.profile_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY entitlements_tenant_isolation ON user_profiles.profile_entitlements
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- === TABLA COMMUNICATION_CONSENTS ===
CREATE TABLE user_profiles.communication_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    profile_id UUID NOT NULL REFERENCES user_profiles.profiles(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('EMAIL','SMS','PUSH','WHATSAPP')),
    purpose TEXT NOT NULL CHECK (purpose IN ('MARKETING','NOTIFICATIONS','LEGAL','EMERGENCY')),
    allowed BOOLEAN NOT NULL,
    policy_version TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT consents_unique_per_profile UNIQUE (profile_id, channel, purpose)
);

-- Índices para communication_consents
CREATE INDEX idx_consents_tenant_id ON user_profiles.communication_consents(tenant_id);
CREATE INDEX idx_consents_profile_id ON user_profiles.communication_consents(profile_id);
CREATE INDEX idx_consents_channel ON user_profiles.communication_consents(channel);
CREATE INDEX idx_consents_purpose ON user_profiles.communication_consents(purpose);

-- RLS para communication_consents
ALTER TABLE user_profiles.communication_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY consents_tenant_isolation ON user_profiles.communication_consents
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- === TABLA PROFILE_HISTORY ===
CREATE TABLE user_profiles.profile_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    condominium_id UUID,
    profile_id UUID NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'PROFILE_CREATED', 'PROFILE_UPDATED', 'STATUS_CHANGED', 
        'MEMBERSHIP_CREATED', 'MEMBERSHIP_UPDATED', 'MEMBERSHIP_TERMINATED',
        'ROLE_ASSIGNED', 'ROLE_REVOKED', 'ENTITLEMENT_GRANTED', 'ENTITLEMENT_REVOKED'
    )),
    data JSONB NOT NULL,
    actor UUID REFERENCES user_profiles.profiles(id),
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Particionado por mes para performance
    CONSTRAINT profile_history_valid_data CHECK (jsonb_typeof(data) = 'object')
) PARTITION BY RANGE (ts);

-- Crear particiones iniciales (ejemplo para 2025)
CREATE TABLE user_profiles.profile_history_2025_01 PARTITION OF user_profiles.profile_history
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE user_profiles.profile_history_2025_02 PARTITION OF user_profiles.profile_history
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE user_profiles.profile_history_2025_03 PARTITION OF user_profiles.profile_history
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Índices para profile_history
CREATE INDEX idx_profile_history_tenant_id ON user_profiles.profile_history(tenant_id);
CREATE INDEX idx_profile_history_profile_id ON user_profiles.profile_history(profile_id);
CREATE INDEX idx_profile_history_event_type ON user_profiles.profile_history(event_type);
CREATE INDEX idx_profile_history_ts ON user_profiles.profile_history(ts);

-- RLS para profile_history
ALTER TABLE user_profiles.profile_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_history_tenant_isolation ON user_profiles.profile_history
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- === TABLA MEMBERSHIP_HISTORY ===
CREATE TABLE user_profiles.membership_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    condominium_id UUID,
    membership_id UUID NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'MEMBERSHIP_CREATED', 'MEMBERSHIP_UPDATED', 'MEMBERSHIP_TERMINATED', 'MEMBERSHIP_TRANSFERRED'
    )),
    data JSONB NOT NULL,
    actor UUID REFERENCES user_profiles.profiles(id),
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT membership_history_valid_data CHECK (jsonb_typeof(data) = 'object')
) PARTITION BY RANGE (ts);

-- Crear particiones iniciales
CREATE TABLE user_profiles.membership_history_2025_01 PARTITION OF user_profiles.membership_history
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE user_profiles.membership_history_2025_02 PARTITION OF user_profiles.membership_history
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE user_profiles.membership_history_2025_03 PARTITION OF user_profiles.membership_history
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Índices para membership_history
CREATE INDEX idx_membership_history_tenant_id ON user_profiles.membership_history(tenant_id);
CREATE INDEX idx_membership_history_membership_id ON user_profiles.membership_history(membership_id);
CREATE INDEX idx_membership_history_event_type ON user_profiles.membership_history(event_type);
CREATE INDEX idx_membership_history_ts ON user_profiles.membership_history(ts);

-- RLS para membership_history
ALTER TABLE user_profiles.membership_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY membership_history_tenant_isolation ON user_profiles.membership_history
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- === TABLA POLICY_BINDINGS ===
CREATE TABLE user_profiles.policy_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    condominium_id UUID NOT NULL,
    policy_id UUID NOT NULL,
    policy_version TEXT NOT NULL,
    scope TEXT NOT NULL CHECK (scope IN ('CONDOMINIUM', 'UNIT', 'ROLE')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT policy_bindings_unique_active UNIQUE (condominium_id, policy_id, scope)
        WHERE active = true
);

-- Índices para policy_bindings
CREATE INDEX idx_policy_bindings_tenant_id ON user_profiles.policy_bindings(tenant_id);
CREATE INDEX idx_policy_bindings_condominium_id ON user_profiles.policy_bindings(condominium_id);
CREATE INDEX idx_policy_bindings_policy_id ON user_profiles.policy_bindings(policy_id);
CREATE INDEX idx_policy_bindings_active ON user_profiles.policy_bindings(condominium_id, active);

-- RLS para policy_bindings
ALTER TABLE user_profiles.policy_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_bindings_tenant_isolation ON user_profiles.policy_bindings
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- === TRIGGERS ===

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION user_profiles.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas principales
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON user_profiles.profiles
    FOR EACH ROW EXECUTE FUNCTION user_profiles.update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON user_profiles.memberships
    FOR EACH ROW EXECUTE FUNCTION user_profiles.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON user_profiles.roles
    FOR EACH ROW EXECUTE FUNCTION user_profiles.update_updated_at_column();

CREATE TRIGGER update_policy_bindings_updated_at BEFORE UPDATE ON user_profiles.policy_bindings
    FOR EACH ROW EXECUTE FUNCTION user_profiles.update_updated_at_column();

-- Trigger para validar responsible_profile_id
CREATE OR REPLACE FUNCTION user_profiles.validate_responsible_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo validar si hay responsible_profile_id
    IF NEW.responsible_profile_id IS NOT NULL THEN
        -- Verificar que el responsable existe y pertenece al mismo condominio
        IF NOT EXISTS (
            SELECT 1 FROM user_profiles.memberships m
            WHERE m.profile_id = NEW.responsible_profile_id
            AND m.condominium_id = NEW.condominium_id
            AND m.relation IN ('OWNER', 'TENANT')
            AND m.status = 'ACTIVE'
            AND m.tenant_id = NEW.tenant_id
        ) THEN
            RAISE EXCEPTION 'responsible_profile_id must be an active OWNER or TENANT in the same condominium';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_responsible_profile_trigger 
    BEFORE INSERT OR UPDATE ON user_profiles.memberships
    FOR EACH ROW EXECUTE FUNCTION user_profiles.validate_responsible_profile();

-- === FUNCIONES AUXILIARES ===

-- Función para obtener permisos efectivos de un perfil
CREATE OR REPLACE FUNCTION user_profiles.get_effective_permissions(
    p_profile_id UUID,
    p_condominium_id UUID
) RETURNS TEXT[] AS $$
DECLARE
    permissions TEXT[] := '{}';
    role_perms TEXT[];
BEGIN
    -- Obtener permisos de roles activos
    SELECT array_agg(DISTINCT perm)
    INTO permissions
    FROM user_profiles.role_assignments ra
    JOIN user_profiles.roles r ON ra.role_id = r.id
    CROSS JOIN LATERAL jsonb_array_elements_text(r.permissions) AS perm
    WHERE ra.profile_id = p_profile_id
    AND ra.condominium_id = p_condominium_id
    AND ra.revoked_at IS NULL
    AND ra.tenant_id = current_setting('app.current_tenant')::uuid;
    
    RETURN COALESCE(permissions, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un perfil tiene un permiso específico
CREATE OR REPLACE FUNCTION user_profiles.has_permission(
    p_profile_id UUID,
    p_condominium_id UUID,
    p_permission TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_permission = ANY(user_profiles.get_effective_permissions(p_profile_id, p_condominium_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- === DATOS INICIALES ===

-- Insertar roles del sistema por defecto (se crearán por tenant/condominio)
-- Estos son templates que se pueden activar

-- Comentarios para documentación
COMMENT ON SCHEMA user_profiles IS 'Esquema para gestión de perfiles de usuario, membresías y roles';
COMMENT ON TABLE user_profiles.profiles IS 'Perfiles de usuario - fuente canónica de identidad';
COMMENT ON TABLE user_profiles.memberships IS 'Membresías de usuarios en condominios/unidades';
COMMENT ON TABLE user_profiles.roles IS 'Roles definidos por condominio';
COMMENT ON TABLE user_profiles.role_assignments IS 'Asignaciones de roles a perfiles';
COMMENT ON TABLE user_profiles.profile_entitlements IS 'Entitlements modulares por servicio';
COMMENT ON TABLE user_profiles.communication_consents IS 'Consentimientos de comunicación por canal/propósito';
COMMENT ON TABLE user_profiles.profile_history IS 'Historial de cambios en perfiles (particionado)';
COMMENT ON TABLE user_profiles.membership_history IS 'Historial de cambios en membresías (particionado)';
COMMENT ON TABLE user_profiles.policy_bindings IS 'Vinculación de políticas de compliance por condominio';

-- Grants finales
GRANT USAGE ON SCHEMA user_profiles TO application_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA user_profiles TO application_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA user_profiles TO application_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA user_profiles TO application_user;