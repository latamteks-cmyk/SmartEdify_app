import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter for RFC 7807 compliance
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global tenant interceptor
  app.useGlobalInterceptors(new TenantInterceptor());

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('SmartEdify Compliance Service')
    .setDescription('Motor de Cumplimiento Normativo Global')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('compliance', 'Gestión de cumplimiento normativo')
    .addTag('policies', 'Políticas y reglas de negocio')
    .addTag('dsar', 'Data Subject Access Rights')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3012;
  await app.listen(port);
  
  console.log(`🚀 Compliance Service running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();