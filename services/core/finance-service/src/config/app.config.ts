export default () => ({
  port: parseInt(process.env.PORT, 10) || 3007,
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

  // Order Configuration
  orders: {
    defaultExpirationMinutes: parseInt(process.env.ORDER_EXPIRATION_MINUTES, 10) || 30,
    maxAmount: parseFloat(process.env.ORDER_MAX_AMOUNT) || 10000,
    supportedCurrencies: (process.env.SUPPORTED_CURRENCIES || 'PEN,USD,EUR').split(','),
  },

  // Payment Providers
  payments: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      enabled: process.env.STRIPE_ENABLED === 'true',
    },
    culqi: {
      secretKey: process.env.CULQI_SECRET_KEY,
      publicKey: process.env.CULQI_PUBLIC_KEY,
      enabled: process.env.CULQI_ENABLED === 'true',
    },
    mercadopago: {
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
      enabled: process.env.MERCADOPAGO_ENABLED === 'true',
    },
  },

  // External Services
  services: {
    reservation: {
      url: process.env.RESERVATION_SERVICE_URL || 'http://reservation-service:3013',
      timeout: parseInt(process.env.RESERVATION_TIMEOUT_MS, 10) || 5000,
    },
    notifications: {
      url: process.env.NOTIFICATIONS_SERVICE_URL || 'http://notifications-service:3005',
      timeout: parseInt(process.env.NOTIFICATIONS_TIMEOUT_MS, 10) || 5000,
    },
  },

  // Rate Limiting
  rateLimit: {
    orderCreate: {
      perUser: parseInt(process.env.RATE_LIMIT_ORDER_CREATE_USER, 10) || 10,
      perTenant: parseInt(process.env.RATE_LIMIT_ORDER_CREATE_TENANT, 10) || 100,
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minute
    },
  },

  // Feature Flags
  features: {
    invoicing: process.env.FEATURE_INVOICING === 'true',
    recurringPayments: process.env.FEATURE_RECURRING_PAYMENTS === 'true',
    refunds: process.env.FEATURE_REFUNDS === 'true',
  },

  // Observability
  observability: {
    otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    tracingEnabled: process.env.TRACING_ENABLED === 'true',
  },
});