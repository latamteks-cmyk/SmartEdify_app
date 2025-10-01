import { registerAs } from '@nestjs/config';

export const DatabaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  name: process.env.DB_NAME || 'smartedify_tenancy',
  ssl: process.env.DB_SSL === 'true',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS, 10) || 20,
  
  // Connection pool settings
  acquireConnectionTimeout: parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT, 10) || 60000,
  createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT_MILLIS, 10) || 30000,
  destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT_MILLIS, 10) || 5000,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MILLIS, 10) || 30000,
  reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL_MILLIS, 10) || 1000,
  createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL_MILLIS, 10) || 200,
  
  // RLS (Row Level Security) settings
  enableRLS: process.env.DB_ENABLE_RLS === 'true',
  defaultTenantId: process.env.DB_DEFAULT_TENANT_ID,
  
  // Migration settings
  migrationsTableName: process.env.DB_MIGRATIONS_TABLE_NAME || 'migrations',
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
  
  // Logging
  logging: process.env.DB_LOGGING === 'true' || process.env.NODE_ENV === 'development',
  logLevel: process.env.DB_LOG_LEVEL || 'info',
}));