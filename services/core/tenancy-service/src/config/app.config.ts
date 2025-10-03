import { registerAs } from '@nestjs/config';

export const AppConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  
  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000,
  
  // Observability
  metricsEnabled: process.env.METRICS_ENABLED === 'true',
  tracingEnabled: process.env.TRACING_ENABLED === 'true',
  
  // OpenTelemetry
  otelServiceName: process.env.OTEL_SERVICE_NAME || 'tenancy-service',
  otelServiceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  otelExporterOtlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  
  // Kafka
  kafkaBrokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'tenancy-service',
  kafkaGroupId: process.env.KAFKA_GROUP_ID || 'tenancy-service-group',
  
  // Security
  encryptionKey: process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars-long',
  
  // Feature flags
  enableAuditLog: process.env.ENABLE_AUDIT_LOG === 'true',
  enableEventSourcing: process.env.ENABLE_EVENT_SOURCING === 'true',
  enableMetrics: process.env.ENABLE_METRICS === 'true',
}));