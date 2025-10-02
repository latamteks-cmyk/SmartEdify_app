import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Configuration
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';

// Modules
import { ReservationsModule } from './modules/reservations/reservations.module';
import { HealthModule } from './health/health.module';

// Entities
import { Reservation } from './modules/reservations/entities/reservation.entity';
import { Amenity } from './modules/reservations/entities/amenity.entity';
import { Attendance } from './modules/reservations/entities/attendance.entity';
import { Blackout } from './modules/reservations/entities/blackout.entity';
import { WaitlistItem } from './modules/reservations/entities/waitlist-item.entity';
import { IdempotencyKey } from './modules/reservations/entities/idempotency-key.entity';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
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
          Reservation,
          Amenity,
          Attendance,
          Blackout,
          WaitlistItem,
          IdempotencyKey,
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
    HealthModule,

    // Domain modules
    ReservationsModule,
  ],
})
export class AppModule {}