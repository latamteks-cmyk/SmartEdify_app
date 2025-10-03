import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsEmail, IsObject, IsDateString } from 'class-validator';
import { OrderType } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsString()
  tenantId: string;

  @ApiProperty({ enum: OrderType, description: 'Type of order' })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty({ description: 'Order amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;

  @ApiProperty({ description: 'Currency code', default: 'PEN' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Order description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Reference ID (e.g., reservation ID)' })
  @IsString()
  referenceId: string;

  @ApiProperty({ description: 'Reference type (e.g., reservation, fee)' })
  @IsString()
  referenceType: string;

  @ApiProperty({ description: 'Customer ID', required: false })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ description: 'Customer email', required: false })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiProperty({ description: 'Customer name', required: false })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiProperty({ description: 'Billing address', required: false })
  @IsObject()
  @IsOptional()
  billingAddress?: any;

  @ApiProperty({ description: 'Order expiration date', required: false })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsObject()
  @IsOptional()
  metadata?: any;
}