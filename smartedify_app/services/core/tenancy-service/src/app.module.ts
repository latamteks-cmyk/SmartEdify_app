import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TerminusModule } from '@nestjs/terminus';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

// Configuration
import { DatabaseConfig } from './config/database.config';
import { AppConfig } from './config/app.config';

// Modules
import { TenantsModule } from './modules/tenants/tenants.module';
import { CondominiumsModule } from './modules/condominiums/condominiums.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { UnitsModule } from './modules/units/units.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig, DatabaseConfig],
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
        ssl: configService.get<boolean>('database.ssl') ? {
          rejectUnauthorized: false,
        } : false,
        synchronize: false, // Always use migrations in production
        logging: configService.get<string>('NODE_ENV') === 'development',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../db/migrations/*{.ts,.js}'],
        migrationsRun: false, // Run manually
        extra: {
          max: configService.get<number>('database.maxConnections', 20),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
      inject: [ConfigService],
    }),

    // Events
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Logging
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        level: configService.get<string>('LOG_LEVEL', 'info'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple(),
            ),
          }),
        ],
      }),
      inject: [ConfigService],
    }),

    // Health checks
    TerminusModule,

    // Business modules
    TenantsModule,
    CondominiumsModule,
    BuildingsModule,
    UnitsModule,
    EventsModule,
    HealthModule,
  ],
})
export class AppModule {}