-- Reservation Service - Initial Schema Migration
-- Version: 1.0.0
-- Date: 2025-01-01
-- Description: Creates tables for reservation management with multi-tenant isolation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create schema_migrations table for tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create amenities table (amenity = unit COMMON from tenancy-service)
CREATE TABLE amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    condominium_id UUID NOT NULL,
    local_code TEXT NOT NULL,
    name TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    min_duration INTERVAL NOT NULL DEFAULT '30 minutes',
    max_duration INTERVAL NOT NULL DEFAULT '4 hours',
    advance_min INTERVAL NOT NULL DEFAULT '1 hour',
    advance_max INTERVAL NOT NULL DEFAULT '90 days',
    check_in_required BOOLEAN NOT NULL DEFAULT false,
    check_in_window_min INT NOT NULL DEFAULT 15,
    fee_amount NUMERIC(12,2) DEFAULT 0,
    fee_currency CHAR(3) DEFAULT 'PEN',
    rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, local_code),
    UNIQUE(id, tenant_id) -- Support for composite FK
);

-- Create indexes for amenities
CREATE INDEX idx_amenities_tenant_condo ON amenities(tenant_id, condominium_id);
CREATE INDEX idx_amenities_active ON amenities(active) WHERE active = true;

-- Enable RLS on amenities
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for amenities
CREATE POLICY tenant_isolation_amenities ON amenities
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY condominium_isolation_amenities ON amenities
    USING (
        current_setting('app.condominium_id', true) IS NULL OR
        condominium_id = current_setting('app.condominium_id', true)::uuid
    );

-- Create reservations table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    condominium_id UUID NOT NULL,
    amenity_id UUID NOT NULL,
    created_by TEXT NOT NULL,
    user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_UNPAID' CHECK (status IN ('PENDING_UNPAID', 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')),
    time TSTZRANGE NOT NULL,
    party_size INT NOT NULL DEFAULT 1,
    price_amount NUMERIC(12,2) DEFAULT 0,
    price_currency CHAR(3) DEFAULT 'PEN',
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    reason_cancel TEXT,
    version BIGINT NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (amenity_id, tenant_id) REFERENCES amenities(id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT time_valid CHECK (lower(time) < upper(time))
);

-- Create indexes for reservations
CREATE INDEX idx_reservations_tenant_amenity ON reservations(tenant_id, amenity_id);
CREATE INDEX idx_reservations_tenant_user ON reservations(tenant_id, user_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_created_at ON reservations(created_at);

-- Create GIST index for time overlap detection
CREATE INDEX idx_reservations_time_overlap ON reservations USING GIST (tenant_id, amenity_id, time);

-- Create exclusion constraint to prevent overlapping reservations
ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap
    EXCLUDE USING GIST (
        tenant_id WITH =,
        amenity_id WITH =,
        time WITH &&
    ) WHERE (status IN ('PENDING', 'CONFIRMED', 'PENDING_UNPAID'));

-- Enable RLS on reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reservations
CREATE POLICY tenant_isolation_reservations ON reservations
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY condominium_isolation_reservations ON reservations
    USING (
        current_setting('app.condominium_id', true) IS NULL OR
        condominium_id = current_setting('app.condominium_id', true)::uuid
    );

-- Create attendances table
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    method TEXT NOT NULL CHECK (method IN ('QR', 'BIOMETRIC', 'SMS', 'MANUAL')),
    validation_hash TEXT,
    by_sub TEXT,
    FOREIGN KEY (reservation_id, tenant_id) REFERENCES reservations(id, tenant_id) ON DELETE CASCADE,
    UNIQUE(tenant_id, reservation_id)
);

-- Create indexes for attendances
CREATE INDEX idx_attendances_reservation ON attendances(reservation_id, tenant_id);
CREATE INDEX idx_attendances_check_in ON attendances(check_in_at) WHERE check_in_at IS NOT NULL;

-- Enable RLS on attendances
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for attendances
CREATE POLICY tenant_isolation_attendances ON attendances
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create blackouts table
CREATE TABLE blackouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    amenity_id UUID,
    condominium_id UUID NOT NULL,
    time TSTZRANGE NOT NULL,
    reason TEXT,
    source TEXT NOT NULL CHECK (source IN ('MAINTENANCE', 'ADMIN', 'SYSTEM')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Create indexes for blackouts
CREATE INDEX idx_blackouts_tenant_amenity ON blackouts(tenant_id, COALESCE(amenity_id, '00000000-0000-0000-0000-000000000000'::UUID));
CREATE INDEX idx_blackouts_tenant_condo ON blackouts(tenant_id, condominium_id);

-- Create GIST index for blackout time overlap
CREATE INDEX idx_blackouts_time_overlap ON blackouts USING GIST (tenant_id, COALESCE(amenity_id, '00000000-0000-0000-0000-000000000000'::UUID), time);

-- Enable RLS on blackouts
ALTER TABLE blackouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for blackouts
CREATE POLICY tenant_isolation_blackouts ON blackouts
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY condominium_isolation_blackouts ON blackouts
    USING (
        current_setting('app.condominium_id', true) IS NULL OR
        condominium_id = current_setting('app.condominium_id', true)::uuid
    );

-- Create waitlist_items table
CREATE TABLE waitlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    amenity_id UUID NOT NULL,
    user_id UUID NOT NULL,
    desired_time TSTZRANGE NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (amenity_id, tenant_id) REFERENCES amenities(id, tenant_id) ON DELETE CASCADE
);

-- Create indexes for waitlist_items
CREATE INDEX idx_waitlist_tenant_amenity ON waitlist_items(tenant_id, amenity_id);
CREATE INDEX idx_waitlist_priority ON waitlist_items(priority DESC, created_at ASC);

-- Enable RLS on waitlist_items
ALTER TABLE waitlist_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for waitlist_items
CREATE POLICY tenant_isolation_waitlist_items ON waitlist_items
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create idempotency_keys table
CREATE TABLE idempotency_keys (
    tenant_id UUID NOT NULL,
    route TEXT NOT NULL,
    key TEXT NOT NULL,
    response_status INT,
    response_body JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, route, key)
);

-- Create index for TTL cleanup
CREATE INDEX idx_idempotency_ttl ON idempotency_keys (created_at);

-- Enable RLS on idempotency_keys
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for idempotency_keys
CREATE POLICY tenant_isolation_idempotency_keys ON idempotency_keys
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create updated_at triggers
CREATE TRIGGER update_amenities_updated_at 
    BEFORE UPDATE ON amenities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at 
    BEFORE UPDATE ON reservations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for availability checking
CREATE OR REPLACE FUNCTION check_availability(
    p_tenant_id UUID,
    p_amenity_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
    SELECT NOT EXISTS (
        -- Check for conflicting reservations
        SELECT 1 FROM reservations r
        WHERE r.tenant_id = p_tenant_id
            AND r.amenity_id = p_amenity_id
            AND r.status IN ('PENDING', 'CONFIRMED', 'PENDING_UNPAID')
            AND r.time && tstzrange(p_start_time, p_end_time, '[)')
        
        UNION ALL
        
        -- Check for blackouts
        SELECT 1 FROM blackouts b
        WHERE b.tenant_id = p_tenant_id
            AND (b.amenity_id = p_amenity_id OR b.amenity_id IS NULL)
            AND b.time && tstzrange(p_start_time, p_end_time, '[)')
    );
$$;

-- Migration complete
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('001_reservation_schema', NOW())
ON CONFLICT (version) DO NOTHING;