-- Finance Service - Initial Schema Migration
-- Version: 1.0.0
-- Date: 2025-01-01
-- Description: Creates tables for financial operations with multi-tenant isolation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    condominium_id UUID NOT NULL,
    user_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('RESERVATION_FEE', 'MAINTENANCE_FEE', 'PENALTY', 'SERVICE_FEE', 'OTHER')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PAID', 'CANCELLED', 'REFUNDED', 'EXPIRED')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    expires_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for orders
CREATE INDEX idx_orders_tenant_user ON orders(tenant_id, user_id);
CREATE INDEX idx_orders_tenant_condo ON orders(tenant_id, condominium_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_expires_at ON orders(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_reference ON orders(reference_id, reference_type) WHERE reference_id IS NOT NULL;

-- Enable RLS on orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for orders
CREATE POLICY tenant_isolation_orders ON orders
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create payment_methods table
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'CASH')),
    display_name VARCHAR(100) NOT NULL,
    provider_method_id VARCHAR(255),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for payment_methods
CREATE INDEX idx_payment_methods_tenant_user ON payment_methods(tenant_id, user_id);
CREATE INDEX idx_payment_methods_active ON payment_methods(is_active) WHERE is_active = true;
CREATE INDEX idx_payment_methods_default ON payment_methods(tenant_id, user_id, is_default) WHERE is_default = true;

-- Enable RLS on payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for payment_methods
CREATE POLICY tenant_isolation_payment_methods ON payment_methods
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method_id UUID REFERENCES payment_methods(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED')),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('STRIPE', 'PAYPAL', 'MERCADOPAGO', 'CULQI', 'NIUBIZ', 'MANUAL')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    provider_payment_id VARCHAR(255),
    provider_transaction_id VARCHAR(255),
    processed_at TIMESTAMPTZ,
    failure_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for payments
CREATE INDEX idx_payments_tenant_user ON payments(tenant_id, user_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_provider_payment_id ON payments(provider_payment_id) WHERE provider_payment_id IS NOT NULL;

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for payments
CREATE POLICY tenant_isolation_payments ON payments
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    condominium_id UUID NOT NULL,
    user_id UUID NOT NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('RESERVATION', 'MAINTENANCE', 'PENALTY', 'SERVICE', 'OTHER')),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED')),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    tax NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    currency CHAR(3) NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    description TEXT,
    line_items JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for invoices
CREATE INDEX idx_invoices_tenant_user ON invoices(tenant_id, user_id);
CREATE INDEX idx_invoices_tenant_condo ON invoices(tenant_id, condominium_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- Enable RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for invoices
CREATE POLICY tenant_isolation_invoices ON invoices
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create updated_at triggers
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at 
    BEFORE UPDATE ON payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for order expiration
CREATE OR REPLACE FUNCTION expire_orders()
RETURNS INTEGER
LANGUAGE SQL
AS $$
    UPDATE orders 
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE status = 'PENDING' 
        AND expires_at < NOW();
    
    SELECT COUNT(*)::INTEGER FROM orders WHERE status = 'EXPIRED';
$$;

-- Create function for payment reconciliation
CREATE OR REPLACE FUNCTION reconcile_payments(
    p_tenant_id UUID,
    p_from_date DATE,
    p_to_date DATE
)
RETURNS TABLE (
    order_id UUID,
    order_amount NUMERIC(12,2),
    paid_amount NUMERIC(12,2),
    payment_count INTEGER,
    status TEXT
)
LANGUAGE SQL STABLE
AS $$
    SELECT 
        o.id as order_id,
        o.amount as order_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        COUNT(p.id)::INTEGER as payment_count,
        CASE 
            WHEN o.status = 'PAID' AND COALESCE(SUM(p.amount), 0) >= o.amount THEN 'RECONCILED'
            WHEN o.status = 'PAID' AND COALESCE(SUM(p.amount), 0) < o.amount THEN 'UNDERPAID'
            WHEN o.status != 'PAID' AND COALESCE(SUM(p.amount), 0) > 0 THEN 'OVERPAID'
            ELSE 'PENDING'
        END as status
    FROM orders o
    LEFT JOIN payments p ON o.id = p.order_id AND p.status = 'COMPLETED'
    WHERE o.tenant_id = p_tenant_id
        AND o.created_at::date BETWEEN p_from_date AND p_to_date
    GROUP BY o.id, o.amount, o.status;
$$;

-- Migration complete
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('001_finance_schema', NOW())
ON CONFLICT (version) DO NOTHING;