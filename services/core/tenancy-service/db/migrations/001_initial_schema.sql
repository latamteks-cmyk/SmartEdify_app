-- Migration: 001_initial_schema.sql
-- Description: Esquema inicial para tenancy-service
-- Author: SmartEdify Platform Team
-- Date: 2025-09-30

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear esquema para el servicio
CREATE SCHEMA IF NOT EXISTS tenancy;

-- Configurar RLS por defecto
ALTER DEFAULT PRIVILEGES IN SCHEMA tenancy GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO application_user;

-- === TABLA TENANTS ===
CREATE TABLE tenancy.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('ADMINISTRADORA','JUNTA')),
    legal_name TEXT NOT NULL CHECK (char_length(legal_name) <= 200),
    country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','CANCELLED')),
    contact_email TEXT CHECK (contact_email ~ '^[^@]+@[^@]+\.[^@]+$'),
    tax_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT tenants_unique_legal_name UNIQUE (legal_name, country_code)
);

-- Índices para tenants
CREATE INDEX idx_tenants_type ON tenancy.tenants(type);
CREATE INDEX idx_tenants_country_code ON tenancy.tenants(country_code);
CREATE INDEX idx_tenants_status ON tenancy.tenants(status);
CREATE INDEX idx_tenants_created_at ON tenancy.tenants(created_at);

-- === TABLA CONDOMINIUMS ===
CREATE TABLE tenancy.condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenancy.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) <= 200),
    address TEXT,
    country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
    financial_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT condominiums_unique_name_per_tenant UNIQUE (tenant_id, name),
    CONSTRAINT condominiums_valid_financial_profile CHECK (jsonb_typeof(financial_profile) = 'object')
);

-- Índices para condominiums
CREATE INDEX idx_condominiums_tenant_id ON tenancy.condominiums(tenant_id);
CREATE INDEX idx_condominiums_country_code ON tenancy.condominiums(country_code);
CREATE INDEX idx_condominiums_status ON tenancy.condominiums(status);
CREATE INDEX idx_condominiums_name ON tenancy.condominiums(name);

-- RLS para condominiums
ALTER TABLE tenancy.condominiums ENABLE ROW LEVEL SECURITY;

CREATE POLICY condominiums_tenant_isolation ON tenancy.condominiums
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- === TABLA BUILDINGS ===
CREATE TABLE tenancy.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    condominium_id UUID NOT NULL REFERENCES tenancy.condominiums(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    levels INTEGER CHECK (levels IS NULL OR levels >= 1),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT buildings_unique_name_per_condo UNIQUE (tenant_id, condominium_id, name),
    CONSTRAINT buildings_valid_meta CHECK (jsonb_typeof(meta) = 'object')
);

-- Índices para buildings
CREATE INDEX idx_buildings_tenant_id ON tenancy.buildings(tenant_id);
CREATE INDEX idx_buildings_condominium_id ON tenancy.buildings(condominium_id);
CREATE INDEX idx_buildings_name ON tenancy.buildings(name);

-- RLS para buildings
ALTER TABLE tenancy.buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY buildings_tenant_isolation ON tenancy.buildings
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- === TABLA UNITS ===
CREATE TABLE tenancy.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    condominium_id UUID NOT NULL REFERENCES tenancy.condominiums(id) ON DELETE CASCADE,
    local_code TEXT NOT NULL CHECK (char_length(local_code) <= 50),
    kind TEXT NOT NULL CHECK (kind IN ('PRIVATE','COMMON')),
    common_type TEXT,
    building_id UUID REFERENCES tenancy.buildings(id),
    aliquot NUMERIC(7,4) DEFAULT 0 CHECK (aliquot >= 0 AND aliquot <= 1),
    floor TEXT,
    area_m2 NUMERIC CHECK (area_m2 IS NULL OR area_m2 >= 0),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    cost_center_id TEXT,
    revenue_cfg JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT units_unique_local_code_per_condo UNIQUE (tenant_id, condominium_id, local_code),
    CONSTRAINT units_common_type_logic CHECK (
        (kind = 'COMMON' AND common_type IS NOT NULL) OR 
        (kind = 'PRIVATE' AND common_type IS NULL)
    ),
    CONSTRAINT units_valid_meta CHECK (jsonb_typeof(meta) = 'object'),
    CONSTRAINT units_valid_revenue_cfg CHECK (jsonb_typeof(revenue_cfg) = 'object'),
    CONSTRAINT units_building_same_tenant CHECK (
        building_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM tenancy.buildings b 
            WHERE b.id = building_id AND b.tenant_id = tenant_id
        )
    )
);

-- Índices para units
CREATE INDEX idx_units_tenant_id ON tenancy.units(tenant_id);
CREATE INDEX idx_units_condominium_id ON tenancy.units(condominium_id);
CREATE INDEX idx_units_local_code ON tenancy.units(local_code);
CREATE INDEX idx_units_kind ON tenancy.units(kind);
CREATE INDEX idx_units_building_id ON tenancy.units(building_id);
CREATE INDEX idx_units_status ON tenancy.units(status);
CREATE INDEX idx_units_common_type ON tenancy.units(common_type) WHERE kind = 'COMMON';
CREATE INDEX idx_units_aliquot ON tenancy.units(aliquot) WHERE kind = 'PRIVATE';

-- Índice compuesto para consultas frecuentes
CREATE INDEX idx_units_tenant_condo_kind ON tenancy.units(tenant_id, condominium_id, kind);
CREATE INDEX idx_units_active_private ON tenancy.units(tenant_id, condominium_id, aliquot) 
    WHERE kind = 'PRIVATE' AND status = 'ACTIVE';

-- RLS para units
ALTER TABLE tenancy.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY units_tenant_isolation ON tenancy.units
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- === TRIGGERS ===

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION tenancy.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenancy.tenants
    FOR EACH ROW EXECUTE FUNCTION tenancy.update_updated_at_column();

CREATE TRIGGER update_condominiums_updated_at BEFORE UPDATE ON tenancy.condominiums
    FOR EACH ROW EXECUTE FUNCTION tenancy.update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON tenancy.buildings
    FOR EACH ROW EXECUTE FUNCTION tenancy.update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON tenancy.units
    FOR EACH ROW EXECUTE FUNCTION tenancy.update_updated_at_column();

-- Trigger para validar building_id pertenece al mismo tenant
CREATE OR REPLACE FUNCTION tenancy.validate_building_tenant()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo validar si hay building_id
    IF NEW.building_id IS NOT NULL THEN
        -- Verificar que el building pertenece al mismo tenant y condominio
        IF NOT EXISTS (
            SELECT 1 FROM tenancy.buildings b
            WHERE b.id = NEW.building_id
            AND b.tenant_id = NEW.tenant_id
            AND b.condominium_id = NEW.condominium_id
        ) THEN
            RAISE EXCEPTION 'building_id must belong to the same tenant and condominium';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_building_tenant_trigger 
    BEFORE INSERT OR UPDATE ON tenancy.units
    FOR EACH ROW EXECUTE FUNCTION tenancy.validate_building_tenant();

-- === FUNCIONES AUXILIARES ===

-- Función para calcular suma de alícuotas por condominio
CREATE OR REPLACE FUNCTION tenancy.get_aliquot_sum(p_condominium_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_aliquot NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(aliquot), 0)
    INTO total_aliquot
    FROM tenancy.units
    WHERE condominium_id = p_condominium_id
    AND kind = 'PRIVATE'
    AND status = 'ACTIVE'
    AND tenant_id = current_setting('app.current_tenant')::uuid;
    
    RETURN total_aliquot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para rebalancear alícuotas por área
CREATE OR REPLACE FUNCTION tenancy.rebalance_aliquots_by_area(p_condominium_id UUID)
RETURNS TABLE(unit_id UUID, old_aliquot NUMERIC, new_aliquot NUMERIC) AS $$
DECLARE
    total_area NUMERIC := 0;
    unit_record RECORD;
BEGIN
    -- Calcular área total de unidades privadas
    SELECT COALESCE(SUM(area_m2), 0)
    INTO total_area
    FROM tenancy.units
    WHERE condominium_id = p_condominium_id
    AND kind = 'PRIVATE'
    AND status = 'ACTIVE'
    AND area_m2 IS NOT NULL
    AND tenant_id = current_setting('app.current_tenant')::uuid;
    
    -- Si no hay área total, no se puede rebalancear
    IF total_area <= 0 THEN
        RAISE EXCEPTION 'Cannot rebalance: no units with valid area found';
    END IF;
    
    -- Actualizar alícuotas proporcionalmente
    FOR unit_record IN
        SELECT u.id, u.aliquot, u.area_m2
        FROM tenancy.units u
        WHERE u.condominium_id = p_condominium_id
        AND u.kind = 'PRIVATE'
        AND u.status = 'ACTIVE'
        AND u.area_m2 IS NOT NULL
        AND u.tenant_id = current_setting('app.current_tenant')::uuid
    LOOP
        unit_id := unit_record.id;
        old_aliquot := unit_record.aliquot;
        new_aliquot := ROUND((unit_record.area_m2 / total_area)::NUMERIC, 4);
        
        -- Actualizar la unidad
        UPDATE tenancy.units 
        SET aliquot = new_aliquot
        WHERE id = unit_record.id;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para validar consistencia de alícuotas
CREATE OR REPLACE FUNCTION tenancy.validate_aliquot_consistency(p_condominium_id UUID)
RETURNS TABLE(is_valid BOOLEAN, total_aliquot NUMERIC, deviation NUMERIC, message TEXT) AS $$
DECLARE
    calculated_total NUMERIC;
    allowed_deviation NUMERIC := 0.0001; -- 0.01% de tolerancia
BEGIN
    calculated_total := tenancy.get_aliquot_sum(p_condominium_id);
    
    is_valid := ABS(calculated_total - 1.0) <= allowed_deviation;
    total_aliquot := calculated_total;
    deviation := ABS(calculated_total - 1.0);
    
    IF is_valid THEN
        message := 'Aliquot sum is within acceptable range';
    ELSE
        message := format('Aliquot sum deviation: %s (allowed: %s)', deviation, allowed_deviation);
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- === VISTAS MATERIALIZADAS ===

-- Vista para estadísticas de condominios
CREATE MATERIALIZED VIEW tenancy.condominium_stats AS
SELECT 
    c.id as condominium_id,
    c.tenant_id,
    c.name as condominium_name,
    COUNT(b.id) as buildings_count,
    COUNT(u.id) as units_count,
    COUNT(u.id) FILTER (WHERE u.kind = 'PRIVATE') as private_units_count,
    COUNT(u.id) FILTER (WHERE u.kind = 'COMMON') as common_areas_count,
    COALESCE(SUM(u.area_m2), 0) as total_area_m2,
    COALESCE(SUM(u.aliquot) FILTER (WHERE u.kind = 'PRIVATE'), 0) as aliquot_sum,
    ABS(COALESCE(SUM(u.aliquot) FILTER (WHERE u.kind = 'PRIVATE'), 0) - 1.0) as aliquot_deviation
FROM tenancy.condominiums c
LEFT JOIN tenancy.buildings b ON c.id = b.condominium_id
LEFT JOIN tenancy.units u ON c.id = u.condominium_id AND u.status = 'ACTIVE'
WHERE c.status = 'ACTIVE'
GROUP BY c.id, c.tenant_id, c.name;

-- Índices para la vista materializada
CREATE UNIQUE INDEX idx_condominium_stats_id ON tenancy.condominium_stats(condominium_id);
CREATE INDEX idx_condominium_stats_tenant_id ON tenancy.condominium_stats(tenant_id);

-- === JOBS DE CONSISTENCIA ===

-- Función para job de consistencia de alícuotas
CREATE OR REPLACE FUNCTION tenancy.aliquot_consistency_job()
RETURNS TABLE(condominium_id UUID, is_valid BOOLEAN, deviation NUMERIC, message TEXT) AS $$
DECLARE
    condo_record RECORD;
    validation_result RECORD;
BEGIN
    -- Iterar sobre todos los condominios activos
    FOR condo_record IN
        SELECT c.id, c.name
        FROM tenancy.condominiums c
        WHERE c.status = 'ACTIVE'
    LOOP
        -- Validar consistencia de cada condominio
        SELECT * INTO validation_result
        FROM tenancy.validate_aliquot_consistency(condo_record.id);
        
        condominium_id := condo_record.id;
        is_valid := validation_result.is_valid;
        deviation := validation_result.deviation;
        message := validation_result.message;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- === TRIGGERS DE AUDITORÍA ===

-- Tabla de auditoría para cambios críticos
CREATE TABLE tenancy.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Particionado por mes para performance
    CONSTRAINT audit_log_valid_operation CHECK (operation IN ('INSERT','UPDATE','DELETE'))
) PARTITION BY RANGE (changed_at);

-- Crear particiones iniciales para auditoría
CREATE TABLE tenancy.audit_log_2025_01 PARTITION OF tenancy.audit_log
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE tenancy.audit_log_2025_02 PARTITION OF tenancy.audit_log
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE tenancy.audit_log_2025_03 PARTITION OF tenancy.audit_log
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Índices para audit_log
CREATE INDEX idx_audit_log_tenant_id ON tenancy.audit_log(tenant_id);
CREATE INDEX idx_audit_log_table_name ON tenancy.audit_log(table_name);
CREATE INDEX idx_audit_log_record_id ON tenancy.audit_log(record_id);
CREATE INDEX idx_audit_log_operation ON tenancy.audit_log(operation);
CREATE INDEX idx_audit_log_changed_at ON tenancy.audit_log(changed_at);

-- RLS para audit_log
ALTER TABLE tenancy.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_tenant_isolation ON tenancy.audit_log
    FOR ALL TO application_user
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Función genérica de auditoría
CREATE OR REPLACE FUNCTION tenancy.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO tenancy.audit_log (tenant_id, table_name, record_id, operation, old_values)
        VALUES (OLD.tenant_id, TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO tenancy.audit_log (tenant_id, table_name, record_id, operation, old_values, new_values)
        VALUES (NEW.tenant_id, TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO tenancy.audit_log (tenant_id, table_name, record_id, operation, new_values)
        VALUES (NEW.tenant_id, TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de auditoría
CREATE TRIGGER audit_condominiums_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tenancy.condominiums
    FOR EACH ROW EXECUTE FUNCTION tenancy.audit_trigger();

CREATE TRIGGER audit_buildings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tenancy.buildings
    FOR EACH ROW EXECUTE FUNCTION tenancy.audit_trigger();

CREATE TRIGGER audit_units_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tenancy.units
    FOR EACH ROW EXECUTE FUNCTION tenancy.audit_trigger();

-- === DATOS INICIALES ===

-- Insertar tenant de ejemplo para desarrollo (solo en dev)
-- Este INSERT se ejecutará condicionalmente en el código de la aplicación

-- === COMENTARIOS PARA DOCUMENTACIÓN ===
COMMENT ON SCHEMA tenancy IS 'Esquema para gestión de tenants, condominios, edificios y unidades';
COMMENT ON TABLE tenancy.tenants IS 'Clientes SaaS - administradoras o juntas de propietarios';
COMMENT ON TABLE tenancy.condominiums IS 'Condominios gestionados por cada tenant';
COMMENT ON TABLE tenancy.buildings IS 'Edificios dentro de cada condominio';
COMMENT ON TABLE tenancy.units IS 'Unidades privadas y áreas comunes';
COMMENT ON TABLE tenancy.audit_log IS 'Log de auditoría para cambios críticos (particionado por mes)';

COMMENT ON COLUMN tenancy.units.kind IS 'PRIVATE para propiedades, COMMON para áreas comunes';
COMMENT ON COLUMN tenancy.units.aliquot IS 'Porcentaje de alícuota (0.0 a 1.0) - solo para unidades privadas';
COMMENT ON COLUMN tenancy.units.revenue_cfg IS 'Configuración de ingresos para áreas comunes (JSON)';
COMMENT ON COLUMN tenancy.units.local_code IS 'Código único por condominio (ej: T-101, AC-PISCINA)';

-- === GRANTS FINALES ===
GRANT USAGE ON SCHEMA tenancy TO application_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA tenancy TO application_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA tenancy TO application_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tenancy TO application_user;

-- Grants específicos para vistas materializadas
GRANT SELECT ON tenancy.condominium_stats TO application_user;

-- Configurar refresh automático de vistas materializadas (ejemplo con pg_cron)
-- SELECT cron.schedule('refresh-condominium-stats', '0 */6 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY tenancy.condominium_stats;');