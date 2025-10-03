import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  // URL de conexión principal
  url: process.env.DATABASE_URL || 'postgresql://user_profiles:password@localhost:5432/smartedify_user_profiles',
  
  // Configuración de conexión
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'user_profiles',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'smartedify_user_profiles',
  schema: process.env.DB_SCHEMA || 'user_profiles',

  // Pool de conexiones
  pool: {
    min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
    max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
    idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10) || 30000, // 30 segundos
    connectionTimeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT, 10) || 2000, // 2 segundos
    acquireTimeout: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT, 10) || 60000, // 60 segundos
  },

  // Configuración SSL
  ssl: {
    enabled: process.env.DB_SSL_ENABLED === 'true',
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ca: process.env.DB_SSL_CA,
    cert: process.env.DB_SSL_CERT,
    key: process.env.DB_SSL_KEY,
  },

  // Configuración de logging
  logging: {
    enabled: process.env.DB_LOGGING_ENABLED === 'true',
    logQueries: process.env.DB_LOG_QUERIES === 'true',
    logErrors: process.env.DB_LOG_ERRORS !== 'false',
    maxQueryExecutionTime: parseInt(process.env.DB_MAX_QUERY_EXECUTION_TIME, 10) || 1000, // 1 segundo
  },

  // Configuración de migraciones
  migrations: {
    enabled: process.env.DB_MIGRATIONS_ENABLED !== 'false',
    autoRun: process.env.DB_MIGRATIONS_AUTO_RUN === 'true',
    path: process.env.DB_MIGRATIONS_PATH || './db/migrations',
    tableName: process.env.DB_MIGRATIONS_TABLE || 'migrations',
  },

  // Configuración RLS (Row Level Security)
  rls: {
    enabled: process.env.DB_RLS_ENABLED !== 'false',
    tenantContextVar: process.env.DB_RLS_TENANT_CONTEXT_VAR || 'app.current_tenant',
    applicationUser: process.env.DB_RLS_APPLICATION_USER || 'application_user',
  },

  // Configuración de performance
  performance: {
    statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT, 10) || 30000, // 30 segundos
    lockTimeout: parseInt(process.env.DB_LOCK_TIMEOUT, 10) || 5000, // 5 segundos
    idleInTransactionTimeout: parseInt(process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT, 10) || 60000, // 60 segundos
  },

  // Configuración de backup y replicación
  backup: {
    enabled: process.env.DB_BACKUP_ENABLED === 'true',
    readReplicaUrl: process.env.DB_READ_REPLICA_URL,
    preferReadReplica: process.env.DB_PREFER_READ_REPLICA === 'true',
  },

  // Configuración de monitoreo
  monitoring: {
    slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD, 10) || 1000, // 1 segundo
    connectionPoolMonitoring: process.env.DB_CONNECTION_POOL_MONITORING !== 'false',
    queryPlanLogging: process.env.DB_QUERY_PLAN_LOGGING === 'true',
  },

  // Configuración específica de PostgreSQL
  postgres: {
    applicationName: process.env.DB_APPLICATION_NAME || 'user-profiles-service',
    searchPath: process.env.DB_SEARCH_PATH || 'user_profiles,public',
    timezone: process.env.DB_TIMEZONE || 'UTC',
    
    // Configuración de extensiones requeridas
    requiredExtensions: [
      'uuid-ossp',
      'pgcrypto',
    ],
    
    // Configuración de particionado
    partitioning: {
      enabled: process.env.DB_PARTITIONING_ENABLED !== 'false',
      historyTablePartitionInterval: process.env.DB_HISTORY_PARTITION_INTERVAL || 'monthly',
      autoCreatePartitions: process.env.DB_AUTO_CREATE_PARTITIONS !== 'false',
    },
  },
}));