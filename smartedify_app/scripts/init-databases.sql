-- SmartEdify Database Initialization Script
-- Creates all databases needed for the microservices

-- Create databases for each service
CREATE DATABASE smartedify_identity;
CREATE DATABASE smartedify_tenancy;
CREATE DATABASE smartedify_finance;
CREATE DATABASE smartedify_compliance;
CREATE DATABASE smartedify_reservations;
CREATE DATABASE smartedify_notifications;
CREATE DATABASE smartedify_documents;

-- Create extensions for all databases
\c smartedify_identity;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c smartedify_tenancy;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c smartedify_finance;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c smartedify_compliance;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c smartedify_reservations;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c smartedify_notifications;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c smartedify_documents;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Log initialization
\c smartedify;
CREATE TABLE IF NOT EXISTS initialization_log (
    id SERIAL PRIMARY KEY,
    service VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO initialization_log (service, status, message) 
VALUES ('database-init', 'completed', 'All databases created successfully');