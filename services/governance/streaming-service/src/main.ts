import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:"],
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

  // CORS
  const corsOrigins = configService.get('CORS_ORIGINS', 'http://localhost:3000').split(',');
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'DPoP', 'X-Tenant-ID'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('SmartEdify Streaming Service')
    .setDescription('Gestión segura de sesiones de video para asambleas híbridas')
    .setVersion('2.2.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'DPoP',
        in: 'header',
        description: 'DPoP Proof Token (RFC 9449)',
      },
      'DPoPAuth',
    )
    .addTag('Sessions', 'Gestión de sesiones de video')
    .addTag('Attendance', 'Validación de asistencia')
    .addTag('Moderation', 'Moderación en tiempo real')
    .addTag('Transcription', 'Transcripción automática')
    .addTag('Recording', 'Grabación y auditoría')
    .addTag('Health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get('PORT', 3014);
  await app.listen(port);

  console.log(`🎥 SmartEdify Streaming Service v2.2.0 running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${port}/api/v1/health`);
}

bootstrap();