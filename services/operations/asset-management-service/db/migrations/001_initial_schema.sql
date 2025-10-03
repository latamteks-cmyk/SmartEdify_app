-- Asset Management Service - Initial Schema
-- Version: 1.0.0
-- Description: Complete schema for asset management, maintenance, and work orders

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE smartedify_assets SET row_security = on;

-- =====================================================
-- SPACES TABLE (Áreas y Superficies)
-- =====================================================
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'petroom', 'pasillo', 'lobby', 'parking', 'pool', 'gym', 
        'playground', 'garden', 'rooftop', 'hallway', 'elevator_hall',
        'stairway', 'laundry', 'storage', 'meeting_room', 'coworking',
        'party_room', 'facade', 'entrance', 'common_bathroom'
    )),
    usable_floor_area_m2 NUMERIC(10,2),
    perimeter_m NUMERIC(8,2),
    wall_height_m NUMERIC(5,2),
    wall_area_m2 NUMERIC(10,2) GENERATED ALWAYS AS (perimeter_m * wall_height_m) STORED,
    complexity TEXT DEFAULT 'M' CHECK (complexity IN ('L', 'M', 'H')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for spaces
CREATE INDEX idx_spaces_tenant_id ON spaces(tenant_id);
CREATE INDEX idx_spaces_tenant_category ON spaces(tenant_id, category);
CREATE INDEX idx_spaces_tenant_complexity ON spaces(tenant_id, complexity);

-- RLS for spaces
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY spaces_tenant_isolation ON spaces
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- =====================================================
-- ASSETS TABLE (Activos Hard y Soft)
-- =====================================================
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    space_id UUID REFERENCES spaces(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('HARD', 'SOFT')),
    category TEXT NOT NULL CHECK (category IN (
        -- Hard Assets
        'elevator', 'pump', 'generator', 'hvac', 'electrical', 'plumbing',
        'fire_safety', 'security', 'lighting', 'communication',
        -- Soft Assets
        'garden', 'lobby', 'hallway', 'parking', 'pool', 'gym',
        'playground', 'rooftop', 'facade', 'common_area'
    )),
    criticality TEXT DEFAULT 'B' CHECK (criticality IN ('A', 'B', 'C')),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN (
        'ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_ORDER', 'DECOMMISSIONED'
    )),
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    installation_date DATE,
    warranty_until DATE,
    manual_operacion_id TEXT,
    manual_mantenimiento_id TEXT,
    fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for assets
CREATE INDEX idx_assets_tenant_id ON assets(tenant_id);
CREATE INDEX idx_assets_tenant_type ON assets(tenant_id, type);
CREATE INDEX idx_assets_tenant_category ON assets(tenant_id, category);
CREATE INDEX idx_assets_tenant_criticality ON assets(tenant_id, criticality);
CREATE INDEX idx_assets_tenant_status ON assets(tenant_id, status);
CREATE INDEX idx_assets_warranty_until ON assets(warranty_until);
CREATE INDEX idx_assets_space_id ON assets(space_id);

-- RLS for assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY assets_tenant_isolation ON assets
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- =====================================================
-- MAINTENANCE PLANS TABLE
-- =====================================================
CREATE TABLE maintenance_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    asset_id UUID REFERENCES assets(id),
    space_id UUID REFERENCES spaces(id),
    name TEXT NOT NULL,
    description TEXT,
    maintenance_type TEXT DEFAULT 'PREVENTIVE' CHECK (maintenance_type IN (
        'PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'CONDITION_BASED'
    )),
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'TIME_BASED', 'USAGE_BASED', 'CONDITION_BASED'
    )),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN (
        'ACTIVE', 'INACTIVE', 'SUSPENDED', 'COMPLETED'
    )),
    frequency_value INTEGER,
    frequency_unit TEXT CHECK (frequency_unit IN (
        'DAYS', 'WEEKS', 'MONTHS', 'YEARS', 'HOURS', 'CYCLES'
    )),
    usage_threshold INTEGER,
    condition_thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
    next_execution TIMESTAMPTZ,
    last_execution TIMESTAMPTZ,
    estimated_duration_minutes INTEGER,
    required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    standard_consumables JSONB NOT NULL DEFAULT '{}'::jsonb,
    checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    safety_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT maintenance_plans_asset_or_space CHECK (
        (asset_id IS NOT NULL AND space_id IS NULL) OR 
        (asset_id IS NULL AND space_id IS NOT NULL)
    )
);

-- Indexes for maintenance_plans
CREATE INDEX idx_maintenance_plans_tenant_id ON maintenance_plans(tenant_id);
CREATE INDEX idx_maintenance_plans_tenant_status ON maintenance_plans(tenant_id, status);
CREATE INDEX idx_maintenance_plans_tenant_type ON maintenance_plans(tenant_id, maintenance_type);
CREATE INDEX idx_maintenance_plans_asset_id ON maintenance_plans(asset_id);
CREATE INDEX idx_maintenance_plans_space_id ON maintenance_plans(space_id);
CREATE INDEX idx_maintenance_plans_next_execution ON maintenance_plans(next_execution);

-- RLS for maintenance_plans
ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY maintenance_plans_tenant_isolation ON maintenance_plans
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- =====================================================
-- INCIDENTS TABLE
-- =====================================================
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    asset_id UUID REFERENCES assets(id),
    space_id UUID REFERENCES spaces(id),
    reported_by TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    standardized_description TEXT,
    status TEXT DEFAULT 'OPEN' CHECK (status IN (
        'OPEN', 'CLASSIFIED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    )),
    priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN (
        'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    )),
    source TEXT NOT NULL CHECK (source IN (
        'RESIDENT_APP', 'ADMIN_WEB', 'MOBILE_TECH', 'IOT_SENSOR', 'INSPECTION', 'PREVENTIVE'
    )),
    task_type TEXT CHECK (task_type IN ('technical_maintenance', 'soft_service')),
    task_classification TEXT CHECK (task_classification IN ('URGENT', 'ORDINARY', 'PROGRAMMABLE')),
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    location_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    llm_classification JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- Indexes for incidents
CREATE INDEX idx_incidents_tenant_id ON incidents(tenant_id);
CREATE INDEX idx_incidents_tenant_status ON incidents(tenant_id, status);
CREATE INDEX idx_incidents_tenant_priority ON incidents(tenant_id, priority);
CREATE INDEX idx_incidents_tenant_source ON incidents(tenant_id, source);
CREATE INDEX idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_incidents_asset_id ON incidents(asset_id);
CREATE INDEX idx_incidents_space_id ON incidents(space_id);

-- RLS for incidents
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY incidents_tenant_isolation ON incidents
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- =====================================================
-- TASKS TABLE
-- =====================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    incident_id UUID REFERENCES incidents(id),
    asset_id UUID REFERENCES assets(id),
    space_id UUID REFERENCES spaces(id),
    plan_id UUID REFERENCES maintenance_plans(id),
    group_id UUID, -- For consolidated tasks
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'GENERATED' CHECK (status IN (
        'GENERATED', 'SCHEDULED', 'CONSOLIDATED', 'ESCALATED_TO_SOS',
        'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    )),
    type TEXT NOT NULL CHECK (type IN ('technical_maintenance', 'soft_service')),
    classification TEXT CHECK (classification IN ('URGENT', 'ORDINARY', 'PROGRAMMABLE')),
    scheduled_for TIMESTAMPTZ,
    estimated_duration_minutes INTEGER,
    required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_consumables JSONB NOT NULL DEFAULT '{}'::jsonb,
    instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
    safety_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tasks
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_tenant_status ON tasks(tenant_id, status);
CREATE INDEX idx_tasks_tenant_type ON tasks(tenant_id, type);
CREATE INDEX idx_tasks_tenant_classification ON tasks(tenant_id, classification);
CREATE INDEX idx_tasks_group_id ON tasks(group_id);
CREATE INDEX idx_tasks_scheduled_for ON tasks(scheduled_for);
CREATE INDEX idx_tasks_incident_id ON tasks(incident_id);
CREATE INDEX idx_tasks_asset_id ON tasks(asset_id);
CREATE INDEX idx_tasks_space_id ON tasks(space_id);
CREATE INDEX idx_tasks_plan_id ON tasks(plan_id);

-- RLS for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_tenant_isolation ON tasks
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- =====================================================
-- WORK ORDERS TABLE
-- =====================================================
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    task_id UUID REFERENCES tasks(id),
    asset_id UUID REFERENCES assets(id),
    space_id UUID REFERENCES spaces(id),
    work_order_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION', 'CLEANING', 'REPAIR'
    )),
    status TEXT DEFAULT 'CREATED' CHECK (status IN (
        'CREATED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD',
        'COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED'
    )),
    priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN (
        'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    )),
    assigned_to TEXT,
    assignee_type TEXT CHECK (assignee_type IN (
        'INTERNAL_TECH', 'EXTERNAL_PROVIDER', 'TEAM'
    )),
    created_by TEXT NOT NULL,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
    safety_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    location_validation JSONB NOT NULL DEFAULT '{}'::jsonb,
    consumables_used JSONB NOT NULL DEFAULT '{}'::jsonb,
    completion_report JSONB NOT NULL DEFAULT '{}'::jsonb,
    supervisor_approval JSONB NOT NULL DEFAULT '{}'::jsonb,
    resident_feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for work_orders
CREATE INDEX idx_work_orders_tenant_id ON work_orders(tenant_id);
CREATE INDEX idx_work_orders_tenant_status ON work_orders(tenant_id, status);
CREATE INDEX idx_work_orders_tenant_type ON work_orders(tenant_id, type);
CREATE INDEX idx_work_orders_tenant_priority ON work_orders(tenant_id, priority);
CREATE INDEX idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX idx_work_orders_scheduled_start ON work_orders(scheduled_start);
CREATE INDEX idx_work_orders_due_date ON work_orders(due_date);
CREATE INDEX idx_work_orders_task_id ON work_orders(task_id);
CREATE INDEX idx_work_orders_asset_id ON work_orders(asset_id);
CREATE INDEX idx_work_orders_space_id ON work_orders(space_id);

-- RLS for work_orders
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY work_orders_tenant_isolation ON work_orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- =====================================================
-- CONSUMABLES TABLE (Insumos)
-- =====================================================
CREATE TABLE consumables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    unit TEXT NOT NULL, -- 'pieces', 'liters', 'kg', etc.
    current_stock NUMERIC(10,2) DEFAULT 0,
    min_stock NUMERIC(10,2) DEFAULT 0,
    unit_cost NUMERIC(10,2),
    supplier_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for consumables
CREATE INDEX idx_consumables_tenant_id ON consumables(tenant_id);
CREATE INDEX idx_consumables_tenant_category ON consumables(tenant_id, category);
CREATE INDEX idx_consumables_low_stock ON consumables(tenant_id) WHERE current_stock <= min_stock;

-- RLS for consumables
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;
CREATE POLICY consumables_tenant_isolation ON consumables
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- =====================================================
-- WAREHOUSE DISPATCHES TABLE (Despachos de Almacén)
-- =====================================================
CREATE TABLE warehouse_dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES consumables(id),
    qty NUMERIC(10,2) NOT NULL,
    worker_id TEXT NOT NULL,
    area_id UUID REFERENCES spaces(id),
    work_order_id UUID REFERENCES work_orders(id),
    dispatch_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for warehouse_dispatches
CREATE INDEX idx_warehouse_dispatches_tenant_id ON warehouse_dispatches(tenant_id);
CREATE INDEX idx_warehouse_dispatches_item_id ON warehouse_dispatches(item_id);
CREATE INDEX idx_warehouse_dispatches_worker_id ON warehouse_dispatches(worker_id);
CREATE INDEX idx_warehouse_dispatches_area_id ON warehouse_dispatches(area_id);
CREATE INDEX idx_warehouse_dispatches_work_order_id ON warehouse_dispatches(work_order_id);
CREATE INDEX idx_warehouse_dispatches_dispatch_date ON warehouse_dispatches(dispatch_date);

-- RLS for warehouse_dispatches
ALTER TABLE warehouse_dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY warehouse_dispatches_tenant_isolation ON warehouse_dispatches
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- =====================================================
-- CONSUMPTION VARIANCES TABLE (Variaciones de Consumo)
-- =====================================================
CREATE TABLE consumption_variances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    work_order_id UUID NOT NULL REFERENCES work_orders(id),
    item_id UUID NOT NULL REFERENCES consumables(id),
    planned_qty NUMERIC(10,2) NOT NULL,
    actual_qty NUMERIC(10,2) NOT NULL,
    delta NUMERIC(10,2) GENERATED ALWAYS AS (actual_qty - planned_qty) STORED,
    threshold_pct NUMERIC(5,2) NOT NULL DEFAULT 10.0, -- 10% threshold
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for consumption_variances
CREATE INDEX idx_consumption_variances_tenant_id ON consumption_variances(tenant_id);
CREATE INDEX idx_consumption_variances_work_order_id ON consumption_variances(work_order_id);
CREATE INDEX idx_consumption_variances_item_id ON consumption_variances(item_id);
CREATE INDEX idx_consumption_variances_status ON consumption_variances(status);
CREATE INDEX idx_consumption_variances_significant ON consumption_variances(tenant_id) 
    WHERE ABS(delta) > (planned_qty * threshold_pct / 100);

-- RLS for consumption_variances
ALTER TABLE consumption_variances ENABLE ROW LEVEL SECURITY;
CREATE POLICY consumption_variances_tenant_isolation ON consumption_variances
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_plans_updated_at BEFORE UPDATE ON maintenance_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consumables_updated_at BEFORE UPDATE ON consumables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to generate work order numbers
CREATE OR REPLACE FUNCTION generate_work_order_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    next_number INTEGER;
BEGIN
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(work_order_number FROM 'WO-' || year_part || '-(.*)') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM work_orders
    WHERE work_order_number LIKE 'WO-' || year_part || '-%';
    
    sequence_part := LPAD(next_number::TEXT, 6, '0');
    
    RETURN 'WO-' || year_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next maintenance execution
CREATE OR REPLACE FUNCTION calculate_next_maintenance_execution(
    plan_id UUID,
    base_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    plan_record maintenance_plans%ROWTYPE;
    next_date TIMESTAMPTZ;
BEGIN
    SELECT * INTO plan_record FROM maintenance_plans WHERE id = plan_id;
    
    IF NOT FOUND OR plan_record.trigger_type != 'TIME_BASED' THEN
        RETURN NULL;
    END IF;
    
    next_date := base_date;
    
    CASE plan_record.frequency_unit
        WHEN 'DAYS' THEN
            next_date := next_date + (plan_record.frequency_value || ' days')::INTERVAL;
        WHEN 'WEEKS' THEN
            next_date := next_date + (plan_record.frequency_value * 7 || ' days')::INTERVAL;
        WHEN 'MONTHS' THEN
            next_date := next_date + (plan_record.frequency_value || ' months')::INTERVAL;
        WHEN 'YEARS' THEN
            next_date := next_date + (plan_record.frequency_value || ' years')::INTERVAL;
        ELSE
            RETURN NULL;
    END CASE;
    
    RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUDIT TRAIL TABLE (Optional)
-- =====================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    trace_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for audit_log
CREATE INDEX idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at);

-- RLS for audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_tenant_isolation ON audit_log
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- =====================================================
-- INITIAL DATA / SEED DATA
-- =====================================================

-- Insert default consumable categories
-- This would be handled by seed scripts in a real implementation

COMMIT;