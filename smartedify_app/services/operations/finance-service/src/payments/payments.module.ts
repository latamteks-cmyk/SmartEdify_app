import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';
import { StripeService } from './providers/stripe.service';
import { CulqiService } from './providers/culqi.service';
import { MercadoPagoService } from './providers/mercadopago.service';

@Module({
  imports: [OrdersModule, AuthModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    StripeService,
    CulqiService,
    MercadoPagoService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}