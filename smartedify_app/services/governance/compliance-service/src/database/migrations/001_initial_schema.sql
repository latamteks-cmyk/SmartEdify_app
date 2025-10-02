-- Compliance Service - Initial Schema Migration
-- Version: 1.0.0
-- Date: 2025-01-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security globally
ALTER DATABASE smartedify_compliance SET row_security = on;

-- Create compliance_policies table
CREATE TABLE compliance_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN ('ASSEMBLY', 'VOTING', 'FINANCIAL', 'LABOR', 'DSAR')),
    property_type VARCHAR(50) CHECK (property_type IN ('RESIDENTIAL', 'COMMERCIAL', 'MIXED')),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version VARCHAR(50) NOT NULL,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for compliance_policies
CREATE INDEX idx_compliance_policies_tenant_country_type ON compliance_policies(tenant_id, country_code, policy_type);
CREATE INDEX idx_compliance_policies_active ON compliance_policies(is_active) WHERE is_active = true;
CREATE INDEX idx_compliance_policies_effective ON compliance_policies(effective_from, effective_to) WHERE is_active = true;

-- Enable RLS on compliance_policies
ALTER TABLE compliance_policies ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for compliance_policies
CREATE POLICY tenant_isolation_compliance_policies ON compliance_policies
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create regulatory_profiles table
CREATE TABLE regulatory_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    legal_framework VARCHAR(255) NOT NULL,
    assembly_rules JSONB NOT NULL,
    voting_rules JSONB NOT NULL,
    financial_rules JSONB NOT NULL,
    labor_rules JSONB NOT NULL,
    dsar_rules JSONB NOT NULL,
    custom_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, country_code)
);

-- Create indexes for regulatory_profiles
CREATE INDEX idx_regulatory_profiles_tenant_country ON regulatory_profiles(tenant_id, country_code);
CREATE INDEX idx_regulatory_profiles_active ON regulatory_profiles(is_active) WHERE is_active = true;

-- Enable RLS on regulatory_profiles
ALTER TABLE regulatory_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for regulatory_profiles
CREATE POLICY tenant_isolation_regulatory_profiles ON regulatory_profiles
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create compliance_validations table
CREATE TABLE compliance_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    validation_type VARCHAR(50) NOT NULL CHECK (validation_type IN ('ASSEMBLY', 'QUORUM', 'MAJORITY', 'FINANCIAL', 'LABOR', 'DSAR')),
    entity_id UUID NOT NULL,
    is_valid BOOLEAN NOT NULL,
    validation_result JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    validated_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for compliance_validations
CREATE INDEX idx_compliance_validations_tenant_type ON compliance_validations(tenant_id, validation_type, created_at);
CREATE INDEX idx_compliance_validations_entity ON compliance_validations(entity_id, validation_type);
CREATE INDEX idx_compliance_validations_created_at ON compliance_validations(created_at);

-- Enable RLS on compliance_validations
ALTER TABLE compliance_validations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for compliance_validations
CREATE POLICY tenant_isolation_compliance_validations ON compliance_validations
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_compliance_policies_updated_at 
    BEFORE UPDATE ON compliance_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regulatory_profiles_updated_at 
    BEFORE UPDATE ON regulatory_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default regulatory profiles
INSERT INTO regulatory_profiles (
    tenant_id, 
    country_code, 
    legal_framework, 
    assembly_rules, 
    voting_rules, 
    financial_rules, 
    labor_rules, 
    dsar_rules
) VALUES 
-- Peru profile
(
    '00000000-0000-0000-0000-000000000000'::uuid, -- Default tenant for seeding
    'PE',
    'Ley de Propiedad Horizontal - Ley N° 27157',
    '{
        "minNoticedays": 15,
        "quorumRequirements": {
            "firstCall": 60,
            "secondCall": 30
        },
        "majorityRequirements": {
            "simple": 50,
            "qualified": 66.67,
            "unanimous": 100
        },
        "allowedMethods": ["PRESENCIAL", "VIRTUAL", "MIXTA"]
    }'::jsonb,
    '{
        "allowedMethods": ["DIGITAL", "PRESENCIAL", "DELEGACION"],
        "secretVoting": true,
        "delegationAllowed": true,
        "maxDelegationsPerPerson": 2
    }'::jsonb,
    '{
        "accountingStandard": "PCGE",
        "auditRequired": true,
        "reportingFrequency": "ANNUAL",
        "budgetApprovalRequired": true
    }'::jsonb,
    '{
        "payrollSystem": "PLAME",
        "benefitsRequired": ["CTS", "GRATIFICACION", "VACACIONES"],
        "sst": {
            "required": true,
            "certificationRequired": false
        }
    }'::jsonb,
    '{
        "dataRetentionDays": 2555,
        "rightToPortability": true,
        "rightToErasure": true,
        "consentRequired": true,
        "breachNotificationHours": 48
    }'::jsonb
),
-- Colombia profile
(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'CO',
    'Ley 675 de 2001 - Régimen de Propiedad Horizontal',
    '{
        "minNoticedays": 10,
        "quorumRequirements": {
            "firstCall": 50,
            "secondCall": 25
        },
        "majorityRequirements": {
            "simple": 50,
            "qualified": 70,
            "unanimous": 100
        },
        "allowedMethods": ["PRESENCIAL", "VIRTUAL", "MIXTA"]
    }'::jsonb,
    '{
        "allowedMethods": ["DIGITAL", "PRESENCIAL"],
        "secretVoting": false,
        "delegationAllowed": true,
        "maxDelegationsPerPerson": 1
    }'::jsonb,
    '{
        "accountingStandard": "NIIF",
        "auditRequired": false,
        "reportingFrequency": "QUARTERLY",
        "budgetApprovalRequired": true
    }'::jsonb,
    '{
        "payrollSystem": "PILA",
        "benefitsRequired": ["CESANTIAS", "PRIMA", "VACACIONES"],
        "sst": {
            "required": true,
            "certificationRequired": true
        }
    }'::jsonb,
    '{
        "dataRetentionDays": 1825,
        "rightToPortability": true,
        "rightToErasure": true,
        "consentRequired": true,
        "breachNotificationHours": 72
    }'::jsonb
);

-- Create application user and grant permissions
DO $$
BEGIN
    -- Create application user if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'compliance_service') THEN
        CREATE ROLE compliance_service WITH LOGIN PASSWORD 'compliance_service_password';
    END IF;
END
$$;

-- Grant permissions to application user
GRANT CONNECT ON DATABASE smartedify_compliance TO compliance_service;
GRANT USAGE ON SCHEMA public TO compliance_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO compliance_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO compliance_service;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO compliance_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO compliance_service;

-- Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.tenant_id', tenant_uuid::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO compliance_service;

-- Migration completed successfully
SELECT 'Compliance Service - Initial schema migration completed successfully' as result;