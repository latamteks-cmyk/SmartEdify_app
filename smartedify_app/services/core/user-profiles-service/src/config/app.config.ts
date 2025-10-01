import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: 'user-profiles-service',
  version: '2.1.0',
  port: parseInt(process.env.PORT, 10) || 3002,
  environment: process.env.NODE_ENV || 'development',
  
  // Configuración de API
  api: {
    prefix: 'api/v1/user-profiles',
    version: 'v1',
    title: 'User Profiles Service API',
    description: 'Fuente canónica de perfiles de usuario, membresías, roles locales y entitlements',
  },

  // Configuración de seguridad
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutos
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000, // 1000 requests por ventana
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    },
  },

  // Configuración de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    enableConsole: process.env.ENABLE_CONSOLE_LOGGING !== 'false',
    enableFile: process.env.ENABLE_FILE_LOGGING === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs/user-profiles-service.log',
  },

  // Configuración de métricas
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    path: process.env.METRICS_PATH || '/metrics',
    prefix: process.env.METRICS_PREFIX || 'user_profiles_',
  },

  // Configuración de telemetría
  telemetry: {
    enabled: process.env.TELEMETRY_ENABLED !== 'false',
    serviceName: process.env.OTEL_SERVICE_NAME || 'user-profiles-service',
    serviceVersion: process.env.OTEL_SERVICE_VERSION || '2.1.0',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
  },

  // Configuración de operaciones
  operations: {
    bulk: {
      maxRowsPerJob: parseInt(process.env.BULK_MAX_ROWS_PER_JOB, 10) || 10000,
      maxConcurrentJobs: parseInt(process.env.BULK_MAX_CONCURRENT_JOBS, 10) || 5,
      jobTimeoutMs: parseInt(process.env.BULK_JOB_TIMEOUT_MS, 10) || 300000, // 5 minutos
    },
    exports: {
      maxPerMinute: parseInt(process.env.EXPORTS_MAX_PER_MINUTE, 10) || 10,
      ttlSeconds: parseInt(process.env.EXPORTS_TTL_SECONDS, 10) || 3600, // 1 hora
      maxRecords: parseInt(process.env.EXPORTS_MAX_RECORDS, 10) || 100000,
    },
    permissions: {
      cacheEnabled: process.env.PERMISSIONS_CACHE_ENABLED !== 'false',
      cacheTtlSeconds: parseInt(process.env.PERMISSIONS_CACHE_TTL_SECONDS, 10) || 300, // 5 minutos
      pdpTimeoutMs: parseInt(process.env.PDP_TIMEOUT_MS, 10) || 5000, // 5 segundos
      failClosed: process.env.PDP_FAIL_CLOSED !== 'false', // fail-closed por defecto
    },
  },

  // Configuración de servicios externos
  external: {
    complianceService: {
      url: process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3012',
      timeout: parseInt(process.env.COMPLIANCE_SERVICE_TIMEOUT_MS, 10) || 5000,
      retries: parseInt(process.env.COMPLIANCE_SERVICE_RETRIES, 10) || 3,
    },
    identityService: {
      url: process.env.IDENTITY_SERVICE_URL || 'http://identity-service:3001',
      timeout: parseInt(process.env.IDENTITY_SERVICE_TIMEOUT_MS, 10) || 5000,
      retries: parseInt(process.env.IDENTITY_SERVICE_RETRIES, 10) || 3,
    },
    tenancyService: {
      url: process.env.TENANCY_SERVICE_URL || 'http://tenancy-service:3003',
      timeout: parseInt(process.env.TENANCY_SERVICE_TIMEOUT_MS, 10) || 5000,
      retries: parseInt(process.env.TENANCY_SERVICE_RETRIES, 10) || 3,
    },
  },

  // Configuración de health checks
  health: {
    database: {
      enabled: true,
      timeout: parseInt(process.env.HEALTH_DB_TIMEOUT_MS, 10) || 3000,
    },
    redis: {
      enabled: true,
      timeout: parseInt(process.env.HEALTH_REDIS_TIMEOUT_MS, 10) || 3000,
    },
    external: {
      enabled: true,
      timeout: parseInt(process.env.HEALTH_EXTERNAL_TIMEOUT_MS, 10) || 5000,
    },
  },
}));