import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { createWinstonLogger } from './common/logger/winston.config';
import { setupTelemetry } from './common/telemetry/telemetry.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

async function bootstrap() {
  // Configurar telemetría antes de crear la app
  setupTelemetry();

  const logger = new Logger('Bootstrap');
  
  // Crear logger Winston
  const winstonLogger = createWinstonLogger();
  
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      instance: winstonLogger,
    }),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3002);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Configurar prefijo global de API
  app.setGlobalPrefix('api/v1/user-profiles');

  // Middleware de seguridad
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // Compresión
  app.use(compression());

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // máximo 1000 requests por ventana por IP
    message: {
      type: 'https://smartedify.global/problems/rate-limit-exceeded',
      title: 'Rate Limit Exceeded',
      status: 429,
      detail: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'DPoP',
      'X-Tenant-ID',
      'X-Request-ID',
      'Idempotency-Key',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Response-Time',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
    ],
    credentials: true,
  });

  // Pipes globales
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      const formattedErrors = errors.map(error => ({
        field: error.property,
        constraints: error.constraints,
        value: error.value,
      }));
      
      return {
        type: 'https://smartedify.global/problems/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'One or more fields have invalid values',
        invalid_params: formattedErrors,
      };
    },
  }));

  // Filtros globales
  app.useGlobalFilters(new AllExceptionsFilter());

  // Interceptores globales
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Configurar Swagger/OpenAPI
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('User Profiles Service API')
      .setDescription('Fuente canónica de perfiles de usuario, membresías, roles locales y entitlements')
      .setVersion('2.1.0')
      .setContact(
        'SmartEdify Platform Team',
        'https://smartedify.global',
        'platform@smartedify.global'
      )
      .setLicense('Proprietary', 'https://smartedify.global/license')
      .addServer('http://localhost:3002', 'Development server')
      .addServer('https://api.smartedify.global/v1/user-profiles', 'Production server')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT ES256/EdDSA con kid obligatorio',
        },
        'BearerAuth'
      )
      .addApiKey(
        {
          type: 'apiKey',
          in: 'header',
          name: 'DPoP',
          description: 'DPoP proof JWT (RFC 9449)',
        },
        'DPoP'
      )
      .addTag('Profiles', 'Gestión de perfiles de usuario')
      .addTag('Profile Status', 'Cambios de estado de perfiles')
      .addTag('Memberships', 'Gestión de membresías en condominios')
      .addTag('Roles', 'Gestión de roles y asignaciones')
      .addTag('Catalog', 'Catálogo de plantillas y roles personalizados')
      .addTag('Entitlements', 'Gestión de entitlements modulares')
      .addTag('Permissions', 'Evaluación de permisos efectivos')
      .addTag('Bulk Operations', 'Operaciones masivas')
      .addTag('Exports', 'Exportación de datos')
      .addTag('Privacy', 'Consents y DSAR')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
      },
    });

    logger.log(`📚 Swagger UI available at http://localhost:${port}/api/docs`);
  }

  // Health checks
  app.use('/health/live', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'user-profiles-service',
      version: '2.1.0',
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('🛑 SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('🛑 SIGINT received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 User Profiles Service is running on port ${port}`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`📊 Metrics available at http://localhost:${port}/metrics`);
  
  if (nodeEnv !== 'production') {
    logger.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start User Profiles Service:', error);
  process.exit(1);
});