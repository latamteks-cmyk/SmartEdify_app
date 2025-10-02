import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  RawBody,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService, CreatePaymentRequest } from '../services/payment.service';
import { Payment, PaymentProvider } from '../entities/payment.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { DPoPGuard } from '../../../common/guards/dpop.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @UseGuards(DPoPGuard)
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Payment created successfully' })
  async createPayment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: {
      orderId: string;
      paymentMethodId?: string;
      provider: PaymentProvider;
      metadata?: Record<string, any>;
    },
  ): Promise<Payment> {
    // Get order details to extract amount and currency
    // This would typically come from the order service
    const request: CreatePaymentRequest = {
      tenantId,
      orderId: body.orderId,
      userId: user.sub,
      paymentMethodId: body.paymentMethodId,
      provider: body.provider,
      amount: 0, // This would be fetched from the order
      currency: 'PEN', // This would be fetched from the order
      metadata: body.metadata,
    };

    return this.paymentService.createPayment(request);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment retrieved successfully' })
  async getPayment(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Payment> {
    return this.paymentService.getPayment(tenantId, id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payments for an order' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Order payments retrieved successfully' })
  async getOrderPayments(
    @CurrentTenant() tenantId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<Payment[]> {
    return this.paymentService.getOrderPayments(tenantId, orderId);
  }

  @Post(':id/refund')
  @UseGuards(DPoPGuard)
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment refunded successfully' })
  async refundPayment(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: {
      amount?: number;
      reason?: string;
    },
  ): Promise<Payment> {
    return this.paymentService.refundPayment(tenantId, id, body.amount, body.reason);
  }

  // Webhook endpoints (no auth required)
  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Handle Stripe webhook' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook processed successfully' })
  async handleStripeWebhook(
    @RawBody() payload: Buffer,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    await this.paymentService.handleWebhook(
      PaymentProvider.STRIPE,
      payload.toString(),
      signature,
    );
    return { received: true };
  }

  @Post('webhooks/culqi')
  @ApiOperation({ summary: 'Handle Culqi webhook' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook processed successfully' })
  async handleCulqiWebhook(
    @RawBody() payload: Buffer,
    @Headers('x-culqi-signature') signature: string,
  ): Promise<{ received: boolean }> {
    await this.paymentService.handleWebhook(
      PaymentProvider.CULQI,
      payload.toString(),
      signature,
    );
    return { received: true };
  }

  @Post('webhooks/mercadopago')
  @ApiOperation({ summary: 'Handle MercadoPago webhook' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook processed successfully' })
  async handleMercadoPagoWebhook(
    @RawBody() payload: Buffer,
    @Headers('x-signature') signature: string,
  ): Promise<{ received: boolean }> {
    await this.paymentService.handleWebhook(
      PaymentProvider.MERCADOPAGO,
      payload.toString(),
      signature,
    );
    return { received: true };
  }
}