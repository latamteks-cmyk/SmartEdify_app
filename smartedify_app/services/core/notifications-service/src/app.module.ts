import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Configuration
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import kafkaConfig from './config/kafka.config';

// Modules
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './health/health.module';
import { CommonModule } from './common/common.module';

// Entities
import { Notification } from './modules/notifications/entities/notification.entity';
import { NotificationTemplate } from './modules/templates/entities/notification-template.entity';
import { NotificationChannel } from './modules/channels/entities/notification-channel.entity';
import { EventSchema } from './modules/events/entities/event-schema.entity';
import { NotificationHistory } from './modules/notifications/entities/notification-history.entity';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, kafkaConfig],
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
          Notification,
          NotificationTemplate,
          NotificationChannel,
          EventSchema,
          NotificationHistory,
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
    NotificationsModule,
    TemplatesModule,
    ChannelsModule,
    EventsModule,
  ],
})
export class AppModule {}