-- Notifications Service - Initial Schema Migration
-- Version: 1.0.0
-- Date: 2025-01-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security globally
ALTER DATABASE smartedify_notifications SET row_security = on;

-- Create notification_channels table
CREATE TABLE notification_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('EMAIL', 'SMS', 'PUSH', 'WEBHOOK')),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('SENDGRID', 'MAILGUN', 'SES', 'SMTP', 'TWILIO', 'NEXMO', 'AWS_SNS', 'FCM', 'APNS', 'HTTP')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ERROR')),
    provider_config JSONB NOT NULL,
    rate_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_fallback BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 1,
    retry_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_used_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,
    last_error_message TEXT,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for notification_channels
CREATE INDEX idx_notification_channels_tenant_type ON notification_channels(tenant_id, type);
CREATE INDEX idx_notification_channels_tenant_status ON notification_channels(tenant_id, status);
CREATE INDEX idx_notification_channels_tenant_default ON notification_channels(tenant_id, is_default) WHERE is_default = true;

-- Enable RLS on notification_channels
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for notification_channels
CREATE POLICY tenant_isolation_notification_channels ON notification_channels
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create notification_templates table
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('EMAIL', 'SMS', 'PUSH', 'IN_APP')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('ASSEMBLY', 'VOTING', 'FINANCIAL', 'MAINTENANCE', 'SECURITY', 'GENERAL', 'VERIFICATION', 'REMINDER')),
    country_code VARCHAR(3),
    language VARCHAR(5) NOT NULL DEFAULT 'es',
    subject_template VARCHAR(500) NOT NULL,
    content_template TEXT NOT NULL,
    html_template TEXT,
    template_variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system BOOLEAN NOT NULL DEFAULT false,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for notification_templates
CREATE INDEX idx_notification_templates_tenant_type_category ON notification_templates(tenant_id, type, category);
CREATE INDEX idx_notification_templates_tenant_active ON notification_templates(tenant_id, is_active) WHERE is_active = true;
CREATE UNIQUE INDEX idx_notification_templates_code ON notification_templates(code);

-- Enable RLS on notification_templates
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for notification_templates
CREATE POLICY tenant_isolation_notification_templates ON notification_templates
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create event_schemas table
CREATE TABLE event_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(20) NOT NULL CHECK (category IN ('ASSEMBLY', 'VOTING', 'FINANCIAL', 'USER', 'SYSTEM', 'SECURITY', 'MAINTENANCE')),
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEPRECATED', 'DRAFT')),
    json_schema JSONB NOT NULL,
    example_payload JSONB,
    notification_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
    routing_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_system BOOLEAN NOT NULL DEFAULT false,
    backward_compatible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_type, version)
);

-- Create indexes for event_schemas
CREATE INDEX idx_event_schemas_tenant_type ON event_schemas(tenant_id, event_type);
CREATE INDEX idx_event_schemas_tenant_category ON event_schemas(tenant_id, category);
CREATE INDEX idx_event_schemas_tenant_status ON event_schemas(tenant_id, status);
CREATE UNIQUE INDEX idx_event_schemas_type_version ON event_schemas(event_type, version);

-- Enable RLS on event_schemas
ALTER TABLE event_schemas ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for event_schemas
CREATE POLICY tenant_isolation_event_schemas ON event_schemas
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    type VARCHAR(20) NOT NULL CHECK (type IN ('EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED')),
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    subject VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    html_content TEXT,
    template_id UUID REFERENCES notification_templates(id),
    template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    external_id VARCHAR(255),
    delivery_info JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX idx_notifications_tenant_recipient ON notifications(tenant_id, recipient_id);
CREATE INDEX idx_notifications_tenant_status ON notifications(tenant_id, status);
CREATE INDEX idx_notifications_tenant_type ON notifications(tenant_id, type);
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for notifications
CREATE POLICY tenant_isolation_notifications ON notifications
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create notification_history table
CREATE TABLE notification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATED', 'SCHEDULED', 'SENT', 'DELIVERED', 'FAILED', 'RETRIED', 'CANCELLED', 'UPDATED')),
    previous_status VARCHAR(20) CHECK (previous_status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED')),
    new_status VARCHAR(20) CHECK (new_status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED')),
    details TEXT,
    context_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    error_code VARCHAR(50),
    provider_response JSONB,
    processing_time_ms INTEGER,
    retry_attempt INTEGER NOT NULL DEFAULT 0,
    channel_id UUID REFERENCES notification_channels(id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for notification_history
CREATE INDEX idx_notification_history_tenant_notification ON notification_history(tenant_id, notification_id);
CREATE INDEX idx_notification_history_tenant_action ON notification_history(tenant_id, action);
CREATE INDEX idx_notification_history_created_at ON notification_history(created_at);

-- Enable RLS on notification_history
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for notification_history
CREATE POLICY tenant_isolation_notification_history ON notification_history
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
CREATE TRIGGER update_notification_channels_updated_at 
    BEFORE UPDATE ON notification_channels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_schemas_updated_at 
    BEFORE UPDATE ON event_schemas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default notification templates
INSERT INTO notification_templates (
    tenant_id, 
    code, 
    name, 
    type, 
    category, 
    subject_template, 
    content_template,
    template_variables,
    is_system
) VALUES 
-- Assembly notifications
(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ASSEMBLY_INVITATION',
    'Invitación a Asamblea',
    'EMAIL',
    'ASSEMBLY',
    'Invitación: {{assembly_title}}',
    'Estimado/a {{recipient_name}},

Se le invita a participar en la asamblea "{{assembly_title}}" programada para el {{assembly_date}} a las {{assembly_time}}.

Lugar: {{assembly_location}}
Modalidad: {{assembly_mode}}

Agenda:
{{assembly_agenda}}

Para confirmar su asistencia, haga clic en el siguiente enlace:
{{confirmation_link}}

Atentamente,
{{sender_name}}
{{condominium_name}}',
    '["recipient_name", "assembly_title", "assembly_date", "assembly_time", "assembly_location", "assembly_mode", "assembly_agenda", "confirmation_link", "sender_name", "condominium_name"]'::jsonb,
    true
),
-- Voting notifications
(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'VOTING_REMINDER',
    'Recordatorio de Votación',
    'EMAIL',
    'VOTING',
    'Recordatorio: Votación {{voting_title}}',
    'Estimado/a {{recipient_name}},

Le recordamos que tiene una votación pendiente: "{{voting_title}}"

Fecha límite: {{voting_deadline}}
Estado actual: {{voting_status}}

Para emitir su voto, acceda al siguiente enlace:
{{voting_link}}

Atentamente,
{{sender_name}}
{{condominium_name}}',
    '["recipient_name", "voting_title", "voting_deadline", "voting_status", "voting_link", "sender_name", "condominium_name"]'::jsonb,
    true
),
-- Verification codes
(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'SMS_VERIFICATION_CODE',
    'Código de Verificación SMS',
    'SMS',
    'VERIFICATION',
    'Código de verificación',
    'Su código de verificación es: {{verification_code}}. Válido por {{expiry_minutes}} minutos.',
    '["verification_code", "expiry_minutes"]'::jsonb,
    true
);

-- Insert default event schemas
INSERT INTO event_schemas (
    tenant_id,
    event_type,
    name,
    category,
    json_schema,
    notification_mappings,
    is_system
) VALUES
-- Assembly events
(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'assembly.created',
    'Assembly Created',
    'ASSEMBLY',
    '{
        "type": "object",
        "properties": {
            "assemblyId": {"type": "string", "format": "uuid"},
            "tenantId": {"type": "string", "format": "uuid"},
            "title": {"type": "string"},
            "scheduledAt": {"type": "string", "format": "date-time"},
            "location": {"type": "string"},
            "mode": {"type": "string", "enum": ["PRESENCIAL", "VIRTUAL", "MIXTA"]},
            "agenda": {"type": "array", "items": {"type": "string"}},
            "participants": {"type": "array", "items": {"type": "string", "format": "uuid"}}
        },
        "required": ["assemblyId", "tenantId", "title", "scheduledAt", "participants"]
    }'::jsonb,
    '[
        {
            "templateCode": "ASSEMBLY_INVITATION",
            "condition": "true",
            "priority": "HIGH",
            "channels": ["EMAIL"]
        }
    ]'::jsonb,
    true
),
-- Voting events
(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'voting.reminder',
    'Voting Reminder',
    'VOTING',
    '{
        "type": "object",
        "properties": {
            "votingId": {"type": "string", "format": "uuid"},
            "tenantId": {"type": "string", "format": "uuid"},
            "title": {"type": "string"},
            "deadline": {"type": "string", "format": "date-time"},
            "status": {"type": "string"},
            "participants": {"type": "array", "items": {"type": "string", "format": "uuid"}}
        },
        "required": ["votingId", "tenantId", "title", "deadline", "participants"]
    }'::jsonb,
    '[
        {
            "templateCode": "VOTING_REMINDER",
            "condition": "true",
            "priority": "NORMAL",
            "channels": ["EMAIL", "SMS"]
        }
    ]'::jsonb,
    true
);

-- Create application user and grant permissions
DO $
BEGIN
    -- Create application user if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'notifications_service') THEN
        CREATE ROLE notifications_service WITH LOGIN PASSWORD 'notifications_service_password';
    END IF;
END
$;

-- Grant permissions to application user
GRANT CONNECT ON DATABASE smartedify_notifications TO notifications_service;
GRANT USAGE ON SCHEMA public TO notifications_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO notifications_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO notifications_service;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO notifications_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO notifications_service;

-- Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void AS $
BEGIN
    PERFORM set_config('app.tenant_id', tenant_uuid::text, false);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO notifications_service;

-- Migration completed successfully
SELECT 'Notifications Service - Initial schema migration completed successfully' as result;