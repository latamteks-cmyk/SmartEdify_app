-- User Profiles Service - Initial Schema Migration
-- Version: 1.0.0
-- Date: 2025-01-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security globally
ALTER DATABASE smartedify_profiles SET row_security = on;

-- Create user_profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    document_type VARCHAR(20) CHECK (document_type IN ('DNI', 'CE', 'PASSPORT', 'CC', 'TI', 'NIT')),
    document_number VARCHAR(50),
    birth_date DATE,
    gender VARCHAR(10) CHECK (gender IN ('M', 'F', 'OTHER')),
    nationality VARCHAR(3),
    address JSONB,
    emergency_contact JSONB,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'LOCKED', 'INACTIVE')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id),
    UNIQUE(tenant_id, email),
    UNIQUE(tenant_id, document_type, document_number)
);

-- Create indexes for user_profiles
CREATE INDEX idx_user_profiles_tenant_user ON user_profiles(tenant_id, user_id);
CREATE INDEX idx_user_profiles_tenant_email ON user_profiles(tenant_id, email);
CREATE INDEX idx_user_profiles_tenant_document ON user_profiles(tenant_id, document_type, document_number);
CREATE INDEX idx_user_profiles_status ON user_profiles(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_user_profiles_verified ON user_profiles(is_verified) WHERE is_verified = true;

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_profiles
CREATE POLICY tenant_isolation_user_profiles ON user_profiles
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create profile_status_history table
CREATE TABLE profile_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    from_status VARCHAR(20) NOT NULL,
    to_status VARCHAR(20) NOT NULL,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    changed_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for profile_status_history
CREATE INDEX idx_profile_status_history_tenant_profile ON profile_status_history(tenant_id, profile_id, created_at);
CREATE INDEX idx_profile_status_history_created_at ON profile_status_history(created_at);

-- Enable RLS on profile_status_history
ALTER TABLE profile_status_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for profile_status_history
CREATE POLICY tenant_isolation_profile_status_history ON profile_status_history
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create user_memberships table
CREATE TABLE user_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    condominium_id UUID NOT NULL,
    building_id UUID,
    unit_id UUID,
    membership_type VARCHAR(50) NOT NULL CHECK (membership_type IN ('OWNER', 'TENANT', 'RESIDENT', 'ADMINISTRATOR', 'EMPLOYEE')),
    ownership_percentage DECIMAL(5,2) DEFAULT 0.00,
    voting_rights BOOLEAN NOT NULL DEFAULT false,
    financial_obligations BOOLEAN NOT NULL DEFAULT false,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, profile_id, condominium_id, unit_id, membership_type)
);

-- Create indexes for user_memberships
CREATE INDEX idx_user_memberships_tenant_profile ON user_memberships(tenant_id, profile_id);
CREATE INDEX idx_user_memberships_tenant_condominium ON user_memberships(tenant_id, condominium_id);
CREATE INDEX idx_user_memberships_tenant_unit ON user_memberships(tenant_id, unit_id);
CREATE INDEX idx_user_memberships_type_status ON user_memberships(membership_type, status);
CREATE INDEX idx_user_memberships_voting_rights ON user_memberships(voting_rights) WHERE voting_rights = true;

-- Enable RLS on user_memberships
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_memberships
CREATE POLICY tenant_isolation_user_memberships ON user_memberships
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create user_roles table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    condominium_id UUID,
    building_id UUID,
    role_type VARCHAR(50) NOT NULL CHECK (role_type IN ('ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER', 'COUNCIL_MEMBER', 'MANAGER', 'SECURITY', 'MAINTENANCE')),
    scope VARCHAR(20) NOT NULL DEFAULT 'CONDOMINIUM' CHECK (scope IN ('TENANT', 'CONDOMINIUM', 'BUILDING', 'UNIT')),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for user_roles
CREATE INDEX idx_user_roles_tenant_profile ON user_roles(tenant_id, profile_id);
CREATE INDEX idx_user_roles_tenant_condominium ON user_roles(tenant_id, condominium_id);
CREATE INDEX idx_user_roles_type_scope ON user_roles(role_type, scope);
CREATE INDEX idx_user_roles_status ON user_roles(status) WHERE status = 'ACTIVE';

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_roles
CREATE POLICY tenant_isolation_user_roles ON user_roles
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create user_entitlements table
CREATE TABLE user_entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    action VARCHAR(50) NOT NULL,
    granted_by VARCHAR(50) NOT NULL CHECK (granted_by IN ('ROLE', 'MEMBERSHIP', 'DIRECT', 'INHERITED')),
    granted_from UUID,
    conditions JSONB,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'REVOKED')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for user_entitlements
CREATE INDEX idx_user_entitlements_tenant_profile ON user_entitlements(tenant_id, profile_id);
CREATE INDEX idx_user_entitlements_resource ON user_entitlements(resource_type, resource_id, action);
CREATE INDEX idx_user_entitlements_granted_by ON user_entitlements(granted_by, granted_from);
CREATE INDEX idx_user_entitlements_status ON user_entitlements(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_user_entitlements_dates ON user_entitlements(start_date, end_date);

-- Enable RLS on user_entitlements
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_entitlements
CREATE POLICY tenant_isolation_user_entitlements ON user_entitlements
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_memberships_updated_at 
    BEFORE UPDATE ON user_memberships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at 
    BEFORE UPDATE ON user_roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_entitlements_updated_at 
    BEFORE UPDATE ON user_entitlements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create application user and grant permissions
DO $
BEGIN
    -- Create application user if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'profiles_service') THEN
        CREATE ROLE profiles_service WITH LOGIN PASSWORD 'profiles_service_password';
    END IF;
END
$;

-- Grant permissions to application user
GRANT CONNECT ON DATABASE smartedify_profiles TO profiles_service;
GRANT USAGE ON SCHEMA public TO profiles_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO profiles_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO profiles_service;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO profiles_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO profiles_service;

-- Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void AS $
BEGIN
    PERFORM set_config('app.tenant_id', tenant_uuid::text, false);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO profiles_service;

-- Migration completed successfully
SELECT 'User Profiles Service - Initial schema migration completed successfully' as result;