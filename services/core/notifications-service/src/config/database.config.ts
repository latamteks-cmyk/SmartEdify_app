import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USERNAME || 'notifications_service',
  password: process.env.DATABASE_PASSWORD || 'notifications_service_password',
  name: process.env.DATABASE_NAME || 'smartedify_notifications',
  schema: process.env.DATABASE_SCHEMA || 'public',
  
  // Connection pool
  pool: {
    max: parseInt(process.env.DATABASE_POOL_MAX, 10) || 20,
    min: parseInt(process.env.DATABASE_POOL_MIN, 10) || 5,
    idleTimeout: parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT, 10) || 30000,
    connectionTimeout: parseInt(process.env.DATABASE_POOL_CONNECTION_TIMEOUT, 10) || 2000,
  },
}));