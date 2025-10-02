import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { Order } from '../orders/entities/order.entity';

// Services
import { PaymentService } from './services/payment.service';
import { StripeService } from './services/providers/stripe.service';
import { CulqiService } from './services/providers/culqi.service';
import { MercadoPagoService } from './services/providers/mercadopago.service';

// Controllers
import { PaymentController } from './controllers/payment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentMethod, Order]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    StripeService,
    CulqiService,
    MercadoPagoService,
  ],
  exports: [
    PaymentService,
    StripeService,
    CulqiService,
    MercadoPagoService,
  ],
})
export class PaymentsModule {}