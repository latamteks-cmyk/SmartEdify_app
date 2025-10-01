import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { TerminusModule } from '@nestjs/terminus';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

// Configuration
import { DatabaseConfig } from './config/database.config';
import { AppConfig } from './config/app.config';

// Modules
import { AssetsModule } from './modules/assets/assets.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { MaintenancePlansModule } from './modules/maintenance-plans/maintenance-plans.module';
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
        synchronize: configService.get<boolean>('database.synchronize', false),
        logging: configService.get<boolean>('database.logging'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../db/migrations/*{.ts,.js}'],
        migrationsRun: false, // Run manually
        extra: {
          max: configService.get<number>('database.maxConnections', 25),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
      inject: [ConfigService],
    }),

    // Redis and Bull Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('app.redisHost'),
          port: configService.get<number>('app.redisPort'),
          password: configService.get<string>('app.redisPassword'),
          db: configService.get<number>('app.redisDb'),
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
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Scheduling for maintenance plans
    ScheduleModule.forRoot(),

    // Logging
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        level: configService.get<string>('LOG_LEVEL', 'info'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
          winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
            return JSON.stringify({
              timestamp,
              level,
              message,
              context,
              trace,
              service: 'asset-management-service',
              ...meta,
            });
          }),
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
    AssetsModule,
    SpacesModule,
    IncidentsModule,
    TasksModule,
    WorkOrdersModule,
    MaintenancePlansModule,
    EventsModule,
    HealthModule,
  ],
})
export class AppModule {}