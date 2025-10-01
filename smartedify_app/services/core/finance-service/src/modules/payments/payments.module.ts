import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';

// Services (placeholder for now)
// import { PaymentService } from './services/payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentMethod]),
  ],
  // controllers: [],
  // providers: [PaymentService],
  // exports: [PaymentService],
})
export class PaymentsModule {}