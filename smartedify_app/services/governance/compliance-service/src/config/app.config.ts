export default () => ({
  app: {
    name: process.env.APP_NAME || 'compliance-service',
    version: process.env.APP_VERSION || '1.0.0',
    port: parseInt(process.env.PORT, 10) || 3012,
    environment: process.env.NODE_ENV || 'development',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'smartedify_compliance',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'compliance-service',
    groupId: process.env.KAFKA_GROUP_ID || 'compliance-service-group',
  },
  observability: {
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
    serviceName: process.env.OTEL_SERVICE_NAME || 'compliance-service',
    serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT, 10) || 9090,
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    tracingEnabled: process.env.TRACING_ENABLED === 'true',
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 1000,
  },
  llm: {
    enabled: process.env.LLM_ENABLED === 'true',
    baseUrl: process.env.LLM_BASE_URL || 'http://localhost:8089',
    embeddingsUrl: process.env.EMBEDDINGS_URL || 'http://localhost:8091',
    vectorDbUrl: process.env.VECTOR_DB_URL || 'postgres://postgres:postgres@localhost:5432/compliance_rag',
  },
  policy: {
    cacheTtlSeconds: parseInt(process.env.POLICY_CACHE_TTL_SECONDS, 10) || 300,
    evaluationTimeoutMs: parseInt(process.env.POLICY_EVALUATION_TIMEOUT_MS, 10) || 5000,
    defaultDecision: process.env.DEFAULT_DECISION || 'DENY',
  },
});