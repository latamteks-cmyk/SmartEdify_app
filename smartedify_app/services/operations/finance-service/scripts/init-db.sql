-- SmartEdify Finance Service Database Initialization

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
-- These will be created after Prisma migrations

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- This function will be used by triggers created by Prisma migrations

-- Log initialization
INSERT INTO pg_stat_statements_info (dealloc) VALUES (0) ON CONFLICT DO NOTHING;

-- Create a simple log table for debugging (optional)
CREATE TABLE IF NOT EXISTS service_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initialization log
INSERT INTO service_logs (level, message, metadata) 
VALUES ('INFO', 'Finance Service database initialized', '{"service": "finance-service", "version": "1.0.0"}');

-- Grant permissions (if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO finance_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO finance_user;