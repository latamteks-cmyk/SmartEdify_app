import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Configuration
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import s3Config from './config/s3.config';

// Modules
import { DocumentsModule } from './modules/documents/documents.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { StorageModule } from './modules/storage/storage.module';
import { HealthModule } from './health/health.module';
import { CommonModule } from './common/common.module';

// Entities
import { Document } from './modules/documents/entities/document.entity';
import { DocumentTemplate } from './modules/templates/entities/document-template.entity';
import { DocumentSignature } from './modules/signatures/entities/document-signature.entity';
import { DocumentVersion } from './modules/documents/entities/document-version.entity';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, s3Config],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [
          Document,
          DocumentTemplate,
          DocumentSignature,
          DocumentVersion,
        ],
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
        ssl: configService.get<string>('NODE_ENV') === 'production' ? {
          rejectUnauthorized: false,
        } : false,
      }),
      inject: [ConfigService],
    }),

    // Event Emitter
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 10,
    }),

    // Shared modules
    CommonModule,
    HealthModule,

    // Domain modules
    DocumentsModule,
    TemplatesModule,
    SignaturesModule,
    StorageModule,
  ],
})
export class AppModule {}