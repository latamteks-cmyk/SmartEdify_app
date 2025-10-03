-- Documents Service - Initial Schema Migration
-- Version: 1.0.0
-- Date: 2025-01-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security globally
ALTER DATABASE smartedify_documents SET row_security = on;

-- Create document_templates table
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ASSEMBLY_MINUTES', 'VOTING_RECORD', 'FINANCIAL_REPORT', 'CONTRACT', 'LEGAL_DOCUMENT', 'CERTIFICATE', 'BALLOT_PHOTO', 'OTHER')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('GOVERNANCE', 'FINANCIAL', 'LEGAL', 'ADMINISTRATIVE', 'TECHNICAL')),
    format VARCHAR(20) NOT NULL DEFAULT 'HTML' CHECK (format IN ('HTML', 'MARKDOWN', 'DOCX', 'PDF')),
    country_code VARCHAR(3),
    language VARCHAR(5) NOT NULL DEFAULT 'es',
    template_content TEXT NOT NULL,
    css_styles TEXT,
    template_variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_prompts JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system BOOLEAN NOT NULL DEFAULT false,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    requires_signature BOOLEAN NOT NULL DEFAULT false,
    signature_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for document_templates
CREATE INDEX idx_document_templates_tenant_type_category ON document_templates(tenant_id, type, category);
CREATE INDEX idx_document_templates_tenant_active ON document_templates(tenant_id, is_active) WHERE is_active = true;
CREATE UNIQUE INDEX idx_document_templates_code ON document_templates(code);

-- Enable RLS on document_templates
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for document_templates
CREATE POLICY tenant_isolation_document_templates ON document_templates
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    condominium_id UUID,
    assembly_id UUID,
    voting_id UUID,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ASSEMBLY_MINUTES', 'VOTING_RECORD', 'FINANCIAL_REPORT', 'CONTRACT', 'LEGAL_DOCUMENT', 'CERTIFICATE', 'BALLOT_PHOTO', 'OTHER')),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'PENDING_SIGNATURE', 'SIGNED', 'PUBLISHED', 'ARCHIVED', 'DELETED')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('GOVERNANCE', 'FINANCIAL', 'LEGAL', 'ADMINISTRATIVE', 'TECHNICAL')),
    template_id UUID REFERENCES document_templates(id),
    country_code VARCHAR(3),
    language VARCHAR(5) NOT NULL DEFAULT 'es',
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_bucket VARCHAR(100) NOT NULL,
    file_hash VARCHAR(128) NOT NULL,
    is_encrypted BOOLEAN NOT NULL DEFAULT true,
    encryption_metadata JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL,
    updated_by UUID,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for documents
CREATE INDEX idx_documents_tenant_type ON documents(tenant_id, type);
CREATE INDEX idx_documents_tenant_status ON documents(tenant_id, status);
CREATE INDEX idx_documents_tenant_category ON documents(tenant_id, category);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_condominium ON documents(tenant_id, condominium_id) WHERE condominium_id IS NOT NULL;
CREATE INDEX idx_documents_assembly ON documents(tenant_id, assembly_id) WHERE assembly_id IS NOT NULL;

-- Enable RLS on documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for documents
CREATE POLICY tenant_isolation_documents ON documents
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create document_versions table
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    version_type VARCHAR(20) NOT NULL DEFAULT 'REVISION' CHECK (version_type IN ('INITIAL', 'REVISION', 'CORRECTION', 'AMENDMENT', 'FINAL')),
    change_summary VARCHAR(500),
    change_details TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    file_hash VARCHAR(128) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, version)
);

-- Create indexes for document_versions
CREATE INDEX idx_document_versions_tenant_document ON document_versions(tenant_id, document_id);
CREATE INDEX idx_document_versions_tenant_version ON document_versions(tenant_id, version);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at);
CREATE INDEX idx_document_versions_current ON document_versions(document_id, is_current) WHERE is_current = true;

-- Enable RLS on document_versions
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for document_versions
CREATE POLICY tenant_isolation_document_versions ON document_versions
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create document_signatures table
CREATE TABLE document_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    signer_id UUID NOT NULL,
    signer_name VARCHAR(255) NOT NULL,
    signer_email VARCHAR(255) NOT NULL,
    signer_role VARCHAR(50) NOT NULL CHECK (signer_role IN ('PRESIDENT', 'SECRETARY', 'TREASURER', 'COUNCIL_MEMBER', 'ADMINISTRATOR', 'WITNESS', 'APPROVER')),
    signature_type VARCHAR(20) NOT NULL DEFAULT 'ELECTRONIC' CHECK (signature_type IN ('ELECTRONIC', 'DIGITAL', 'BIOMETRIC', 'HANDWRITTEN')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SIGNED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
    signing_order INTEGER NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT true,
    signature_data TEXT,
    signature_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    signed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    reminder_count INTEGER NOT NULL DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for document_signatures
CREATE INDEX idx_document_signatures_tenant_document ON document_signatures(tenant_id, document_id);
CREATE INDEX idx_document_signatures_tenant_signer ON document_signatures(tenant_id, signer_id);
CREATE INDEX idx_document_signatures_tenant_status ON document_signatures(tenant_id, status);
CREATE INDEX idx_document_signatures_signing_order ON document_signatures(document_id, signing_order);

-- Enable RLS on document_signatures
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for document_signatures
CREATE POLICY tenant_isolation_document_signatures ON document_signatures
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
CREATE TRIGGER update_document_templates_updated_at 
    BEFORE UPDATE ON document_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_signatures_updated_at 
    BEFORE UPDATE ON document_signatures 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default document templates
INSERT INTO document_templates (
    tenant_id, 
    code, 
    name, 
    type, 
    category, 
    template_content,
    template_variables,
    ai_prompts,
    is_system
) VALUES 
-- Assembly Minutes Template
(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ASSEMBLY_MINUTES_PE',
    'Acta de Asamblea - Perú',
    'ASSEMBLY_MINUTES',
    'GOVERNANCE',
    '<html>
<head><title>Acta de Asamblea</title></head>
<body>
<h1>ACTA DE ASAMBLEA GENERAL</h1>
<p><strong>Condominio:</strong> {{condominium_name}}</p>
<p><strong>Fecha:</strong> {{assembly_date}}</p>
<p><strong>Hora:</strong> {{assembly_time}}</p>
<p><strong>Modalidad:</strong> {{assembly_mode}}</p>

<h2>ASISTENTES</h2>
{{attendees_list}}

<h2>AGENDA</h2>
{{agenda_items}}

<h2>DESARROLLO</h2>
{{assembly_content}}

<h2>ACUERDOS</h2>
{{agreements}}

<h2>FIRMAS</h2>
<table>
<tr><td>Presidente: {{president_name}}</td><td>Firma: ________________</td></tr>
<tr><td>Secretario: {{secretary_name}}</td><td>Firma: ________________</td></tr>
</table>
</body>
</html>',
    '["condominium_name", "assembly_date", "assembly_time", "assembly_mode", "attendees_list", "agenda_items", "assembly_content", "agreements", "president_name", "secretary_name"]'::jsonb,
    '{
        "generation": "Generate a comprehensive assembly minutes document based on the provided assembly data, including attendees, agenda items, discussions, and agreements reached.",
        "review": "Review the assembly minutes for completeness, legal compliance, and accuracy of recorded information.",
        "summary": "Create a summary of the key decisions and agreements from this assembly."
    }'::jsonb,
    true
),
-- Voting Record Template
(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'VOTING_RECORD_PE',
    'Registro de Votación - Perú',
    'VOTING_RECORD',
    'GOVERNANCE',
    '<html>
<head><title>Registro de Votación</title></head>
<body>
<h1>REGISTRO DE VOTACIÓN</h1>
<p><strong>Condominio:</strong> {{condominium_name}}</p>
<p><strong>Asunto:</strong> {{voting_subject}}</p>
<p><strong>Fecha:</strong> {{voting_date}}</p>
<p><strong>Tipo:</strong> {{voting_type}}</p>

<h2>RESULTADOS</h2>
<table border="1">
<tr><th>Opción</th><th>Votos</th><th>Porcentaje</th></tr>
{{voting_results}}
</table>

<h2>PARTICIPACIÓN</h2>
<p>Total de propietarios habilitados: {{total_eligible}}</p>
<p>Total de votos emitidos: {{total_votes}}</p>
<p>Porcentaje de participación: {{participation_percentage}}%</p>

<h2>DETALLE DE VOTOS</h2>
{{vote_details}}
</body>
</html>',
    '["condominium_name", "voting_subject", "voting_date", "voting_type", "voting_results", "total_eligible", "total_votes", "participation_percentage", "vote_details"]'::jsonb,
    '{
        "generation": "Generate a detailed voting record document with results, participation statistics, and vote breakdown.",
        "review": "Verify the accuracy of vote counts, percentages, and ensure all required information is included."
    }'::jsonb,
    true
);

-- Create application user and grant permissions
DO $
BEGIN
    -- Create application user if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'documents_service') THEN
        CREATE ROLE documents_service WITH LOGIN PASSWORD 'documents_service_password';
    END IF;
END
$;

-- Grant permissions to application user
GRANT CONNECT ON DATABASE smartedify_documents TO documents_service;
GRANT USAGE ON SCHEMA public TO documents_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO documents_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO documents_service;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO documents_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO documents_service;

-- Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void AS $
BEGIN
    PERFORM set_config('app.tenant_id', tenant_uuid::text, false);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO documents_service;

-- Migration completed successfully
SELECT 'Documents Service - Initial schema migration completed successfully' as result;