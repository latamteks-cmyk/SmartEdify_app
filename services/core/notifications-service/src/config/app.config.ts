import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.SERVICE_NAME || 'notifications-service',
  port: parseInt(process.env.PORT, 10) || 3005,
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // Rate limiting
  rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
  rateLimitLimit: parseInt(process.env.RATE_LIMIT_LIMIT, 10) || 100,
  
  // Multi-tenancy
  defaultTenantId: process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000000',
  tenantHeaderName: process.env.TENANT_HEADER_NAME || 'x-tenant-id',
  
  // External services
  identityServiceUrl: process.env.IDENTITY_SERVICE_URL || 'http://identity-service:3001',
  tenancyServiceUrl: process.env.TENANCY_SERVICE_URL || 'http://tenancy-service:3003',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
}));