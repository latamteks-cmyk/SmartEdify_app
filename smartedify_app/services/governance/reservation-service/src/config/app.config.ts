export default () => ({
  port: parseInt(process.env.PORT, 10) || 3013,
  environment: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },

  // DPoP Configuration
  dpop: {
    secret: process.env.DPOP_SECRET || 'dev-dpop-secret',
    clockSkew: parseInt(process.env.DPOP_CLOCK_SKEW, 10) || 10,
  },

  // External Services
  services: {
    compliance: {
      url: process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3012',
      timeout: parseInt(process.env.COMPLIANCE_TIMEOUT_MS, 10) || 2000,
      circuitBreakerThreshold: parseInt(process.env.COMPLIANCE_CIRCUIT_BREAKER_THRESHOLD, 10) || 5,
    },
    identity: {
      url: process.env.IDENTITY_SERVICE_URL || 'http://identity-service:3001',
      timeout: parseInt(process.env.IDENTITY_TIMEOUT_MS, 10) || 5000,
    },
    finance: {
      url: process.env.FINANCE_SERVICE_URL || 'http://finance-service:3007',
      timeout: parseInt(process.env.FINANCE_TIMEOUT_MS, 10) || 10000,
    },
    notifications: {
      url: process.env.NOTIFICATIONS_SERVICE_URL || 'http://notifications-service:3005',
      timeout: parseInt(process.env.NOTIFICATIONS_TIMEOUT_MS, 10) || 5000,
    },
  },

  // Rate Limiting
  rateLimit: {
    reservationCreate: {
      perUser: parseInt(process.env.RATE_LIMIT_RESERVATION_CREATE_USER, 10) || 30,
      perTenant: parseInt(process.env.RATE_LIMIT_RESERVATION_CREATE_TENANT, 10) || 300,
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minute
    },
    availability: {
      perUser: parseInt(process.env.RATE_LIMIT_AVAILABILITY_USER, 10) || 120,
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minute
    },
  },

  // Feature Flags
  features: {
    waitlist: process.env.FEATURE_WAITLIST === 'true',
    fees: process.env.FEATURE_FEES === 'true',
    checkIn: process.env.FEATURE_CHECK_IN === 'true',
    biometricCheckIn: process.env.FEATURE_BIOMETRIC_CHECK_IN === 'true',
  },

  // Observability
  observability: {
    otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    tracingEnabled: process.env.TRACING_ENABLED === 'true',
  },
});