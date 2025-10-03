import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Invoice } from './entities/invoice.entity';

// Services (placeholder for now)
// import { InvoiceService } from './services/invoice.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
  ],
  // controllers: [],
  // providers: [InvoiceService],
  // exports: [InvoiceService],
})
export class InvoicesModule {}