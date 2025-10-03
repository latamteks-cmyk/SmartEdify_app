import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Configuration
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';

// Modules
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { HealthModule } from './health/health.module';

// Entities
import { Order } from './modules/orders/entities/order.entity';
import { Payment } from './modules/payments/entities/payment.entity';
import { Invoice } from './modules/invoices/entities/invoice.entity';
import { PaymentMethod } from './modules/payments/entities/payment-method.entity';

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
          Order,
          Payment,
          Invoice,
          PaymentMethod,
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

    // Application modules
    HealthModule,
    OrdersModule,
    PaymentsModule,
    InvoicesModule,
  ],
})
export class AppModule {}