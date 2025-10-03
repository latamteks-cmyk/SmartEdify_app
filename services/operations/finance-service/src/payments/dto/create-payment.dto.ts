import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: PaymentProvider, description: 'Payment provider' })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({ description: 'Payment method ID', required: false })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: any;
}