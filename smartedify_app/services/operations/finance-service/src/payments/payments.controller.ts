import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Headers,
  RawBody,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentStatus, PaymentProvider } from '@prisma/client';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  findAll(
    @Query('orderId') orderId?: string,
    @Query('status') status?: PaymentStatus,
    @Query('provider') provider?: PaymentProvider,
  ) {
    return this.paymentsService.findAll(orderId, status, provider);
  }

  @Get('stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStats(@Query('tenantId') tenantId?: string) {
    return this.paymentsService.getPaymentStats(tenantId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id/confirm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirm payment' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  confirm(@Param('id') id: string) {
    return this.paymentsService.confirmPayment(id);
  }

  @Patch(':id/refund')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Refund payment' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  refund(
    @Param('id') id: string,
    @Body() body: { amount?: number; reason?: string },
  ) {
    return this.paymentsService.refundPayment(id, body.amount, body.reason);
  }

  // Webhook endpoints
  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  stripeWebhook(
    @RawBody() payload: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(
      PaymentProvider.STRIPE,
      payload,
      signature,
    );
  }

  @Post('webhooks/culqi')
  @ApiOperation({ summary: 'Culqi webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  culqiWebhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(PaymentProvider.CULQI, payload);
  }

  @Post('webhooks/mercadopago')
  @ApiOperation({ summary: 'MercadoPago webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  mercadopagoWebhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(PaymentProvider.MERCADOPAGO, payload);
  }
}