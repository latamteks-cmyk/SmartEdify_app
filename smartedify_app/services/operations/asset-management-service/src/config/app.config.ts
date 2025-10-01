import { registerAs } from '@nestjs/config';

export const AppConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3010,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  
  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 2000,
  
  // File upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
  allowedImageTypes: process.env.ALLOWED_IMAGE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp'],
  
  // Observability
  metricsEnabled: process.env.METRICS_ENABLED === 'true',
  tracingEnabled: process.env.TRACING_ENABLED === 'true',
  
  // OpenTelemetry
  otelServiceName: process.env.OTEL_SERVICE_NAME || 'asset-management-service',
  otelServiceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  otelExporterOtlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  
  // Redis
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT, 10) || 6379,
  redisPassword: process.env.REDIS_PASSWORD,
  redisDb: parseInt(process.env.REDIS_DB, 10) || 0,
  
  // Kafka
  kafkaBrokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'asset-management-service',
  kafkaGroupId: process.env.KAFKA_GROUP_ID || 'asset-management-service-group',
  
  // External Services
  identityServiceUrl: process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001',
  tenancyServiceUrl: process.env.TENANCY_SERVICE_URL || 'http://localhost:3003',
  financeServiceUrl: process.env.FINANCE_SERVICE_URL || 'http://localhost:3007',
  hrServiceUrl: process.env.HR_SERVICE_URL || 'http://localhost:3009',
  notificationsServiceUrl: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3005',
  documentsServiceUrl: process.env.DOCUMENTS_SERVICE_URL || 'http://localhost:3006',
  marketplaceServiceUrl: process.env.MARKETPLACE_SERVICE_URL || 'http://localhost:3015',
  analyticsServiceUrl: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3016',
  
  // Business Rules
  defaultMaintenanceReminderDays: parseInt(process.env.DEFAULT_MAINTENANCE_REMINDER_DAYS, 10) || 7,
  maxProvidersPerSos: parseInt(process.env.MAX_PROVIDERS_PER_SOS, 10) || 3,
  sosResponseTimeoutHours: parseInt(process.env.SOS_RESPONSE_TIMEOUT_HOURS, 10) || 72,
  workOrderReminderHours: parseInt(process.env.WORK_ORDER_REMINDER_HOURS, 10) || 24,
  
  // Security
  encryptionKey: process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars-long',
  
  // Feature flags
  enableAuditLog: process.env.ENABLE_AUDIT_LOG === 'true',
  enableEventSourcing: process.env.ENABLE_EVENT_SOURCING === 'true',
  enableMetrics: process.env.ENABLE_METRICS === 'true',
  enableOfflineMode: process.env.ENABLE_OFFLINE_MODE === 'true',
  enableLlmClassification: process.env.ENABLE_LLM_CLASSIFICATION === 'true',
  enablePredictiveMaintenance: process.env.ENABLE_PREDICTIVE_MAINTENANCE === 'true',
}));