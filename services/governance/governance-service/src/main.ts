import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WsAdapter } from '@nestjs/platform-ws';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3011);
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');

    // Security middleware
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

    // Compression
    app.use(compression());

    // Rate limiting
    app.use(rateLimit({
      windowMs: configService.get<number>('RATE_LIMIT_WINDOW_MS', 60000),
      max: configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100),
      message: {
        type: 'https://smartedify.global/errors/rate-limit-exceeded',
        title: 'Límite de Tasa Excedido',
        status: 429,
        detail: 'Has excedido el límite de solicitudes por minuto.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }));

    // CORS configuration
    const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000').split(',');
    app.enableCors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'Idempotency-Key'],
      credentials: true,
    });

    // Global pipes
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }));

    // Global filters
    app.useGlobalFilters(new AllExceptionsFilter());

    // Global interceptors
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );

    // WebSocket adapter for real-time features
    app.useWebSocketAdapter(new WsAdapter(app));

    // API prefix
    app.setGlobalPrefix('api/v1');

    // Swagger documentation
    if (nodeEnv !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('SmartEdify Governance Service')
        .setDescription('Plataforma de Gobernanza Comunitaria Internacional para Asambleas Híbridas')
        .setVersion('3.2.2')
        .addBearerAuth()
        .addTag('assemblies', 'Gestión de asambleas')
        .addTag('initiatives', 'Iniciativas de convocatoria')
        .addTag('sessions', 'Sesiones híbridas')
        .addTag('voting', 'Sistema de votación')
        .addTag('contributions', 'Canal de aportes')
        .addTag('minutes', 'Generación de actas')
        .addTag('audit', 'Auditoría y verificación')
        .addTag('health', 'Health checks')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
        },
      });
    }

    await app.listen(port);
    
    logger.log(`🚀 Governance Service running on port ${port}`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    logger.log(`🏥 Health Check: http://localhost:${port}/api/v1/health`);
    logger.log(`🌍 Environment: ${nodeEnv}`);

  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();