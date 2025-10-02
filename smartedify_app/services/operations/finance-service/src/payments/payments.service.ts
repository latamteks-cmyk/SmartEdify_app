import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment, PaymentStatus, PaymentProvider } from '@prisma/client';
import { StripeService, PaymentResult } from './providers/stripe.service';
import { CulqiService } from './providers/culqi.service';
import { MercadoPagoService } from './providers/mercadopago.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private stripeService: StripeService,
    private culqiService: CulqiService,
    private mercadopagoService: MercadoPagoService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    try {
      // Get the order
      const order = await this.ordersService.findOne(createPaymentDto.orderId);
      if (!order) {
        throw new NotFoundException(`Order with ID ${createPaymentDto.orderId} not found`);
      }

      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          orderId: createPaymentDto.orderId,
          provider: createPaymentDto.provider,
          amount: order.amount,
          currency: order.currency,
          status: PaymentStatus.PENDING,
          metadata: createPaymentDto.metadata,
        },
      });

      // Process payment with the selected provider
      const result = await this.processPayment(payment, order);

      // Update payment with provider response
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: result.status,
          providerPaymentId: result.providerPaymentId,
          failureCode: result.success ? null : 'PROVIDER_ERROR',
          failureMessage: result.error,
          metadata: {
            ...(payment.metadata as object || {}),
            ...(result.metadata as object || {}),
          },
          processedAt: result.success ? new Date() : null,
        },
        include: {
          order: true,
        },
      });

      // Update order status if payment is successful
      if (result.success && result.status === PaymentStatus.COMPLETED) {
        await this.ordersService.confirm(order.id);
      }

      this.logger.log(`Payment ${payment.id} processed with status: ${result.status}`);

      return updatedPayment;
    } catch (error) {
      this.logger.error(`Payment creation failed: ${error.message}`);
      throw new BadRequestException(`Failed to create payment: ${error.message}`);
    }
  }

  async findAll(orderId?: string, status?: PaymentStatus, provider?: PaymentProvider) {
    const where: any = {};
    
    if (orderId) where.orderId = orderId;
    if (status) where.status = status;
    if (provider) where.provider = provider;

    return this.prisma.payment.findMany({
      where,
      include: {
        order: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async confirmPayment(id: string): Promise<Payment> {
    const payment = await this.findOne(id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Payment ${id} is not in pending status`);
    }

    // Confirm with provider
    const result = await this.confirmWithProvider(payment);

    // Update payment
    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: result.status,
        failureCode: result.success ? null : 'CONFIRMATION_FAILED',
        failureMessage: result.error,
        metadata: {
          ...(payment.metadata as object || {}),
          ...(result.metadata as object || {}),
        },
        processedAt: result.success ? new Date() : null,
      },
      include: {
        order: true,
      },
    });

    // Update order if payment is successful
    if (result.success && result.status === PaymentStatus.COMPLETED) {
      await this.ordersService.confirm(payment.orderId);
    }

    return updatedPayment;
  }

  async refundPayment(id: string, amount?: number, reason?: string): Promise<Payment> {
    const payment = await this.findOne(id);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(`Payment ${id} is not completed and cannot be refunded`);
    }

    // Process refund with provider
    const result = await this.refundWithProvider(payment, amount, reason);

    // Update payment
    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: result.success ? PaymentStatus.REFUNDED : payment.status,
        failureCode: result.success ? null : 'REFUND_FAILED',
        failureMessage: result.error,
        metadata: {
          ...(payment.metadata as object || {}),
          ...(result.metadata as object || {}),
          refund: {
            amount: amount || payment.amount,
            reason,
            processedAt: new Date(),
          },
        },
      },
      include: {
        order: true,
      },
    });

    // Update order if refund is successful
    if (result.success) {
      await this.ordersService.refund(payment.orderId);
    }

    return updatedPayment;
  }

  async handleWebhook(provider: PaymentProvider, payload: any, signature?: string): Promise<any> {
    try {
      let webhookData: any;

      // Process webhook based on provider
      switch (provider) {
        case PaymentProvider.STRIPE:
          webhookData = await this.stripeService.handleWebhook(payload, signature);
          break;
        case PaymentProvider.CULQI:
          webhookData = await this.culqiService.handleWebhook(payload);
          break;
        case PaymentProvider.MERCADOPAGO:
          webhookData = await this.mercadopagoService.handleWebhook(payload);
          break;
        default:
          throw new BadRequestException(`Unsupported provider: ${provider}`);
      }

      // Store webhook event
      await this.prisma.webhookEvent.create({
        data: {
          provider,
          eventType: webhookData.type,
          eventId: webhookData.id,
          payload: webhookData,
          status: 'PENDING',
        },
      });

      // Process webhook event
      await this.processWebhookEvent(provider, webhookData);

      this.logger.log(`Processed webhook for ${provider}: ${webhookData.type}`);

      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      throw error;
    }
  }

  private async processPayment(payment: Payment, order: any): Promise<PaymentResult> {
    switch (payment.provider) {
      case PaymentProvider.STRIPE:
        return this.stripeService.createPaymentIntent(
          Number(payment.amount),
          payment.currency,
          {
            orderId: order.id,
            paymentId: payment.id,
            customerId: order.customerId,
            customerEmail: order.customerEmail,
          },
        );

      case PaymentProvider.CULQI:
        // For Culqi, we would need a token from the frontend
        // This is a simplified implementation
        return this.culqiService.createCharge(
          Number(payment.amount),
          payment.currency,
          'mock_token', // In real implementation, this comes from frontend
          order.customerEmail || 'customer@example.com',
          {
            orderId: order.id,
            paymentId: payment.id,
          },
        );

      case PaymentProvider.MERCADOPAGO:
        return this.mercadopagoService.createPayment(
          Number(payment.amount),
          payment.currency,
          order.customerEmail || 'customer@example.com',
          order.description || 'Payment',
          {
            orderId: order.id,
            paymentId: payment.id,
          },
        );

      default:
        return {
          success: false,
          paymentId: payment.id,
          status: PaymentStatus.FAILED,
          error: `Unsupported payment provider: ${payment.provider}`,
        };
    }
  }

  private async confirmWithProvider(payment: Payment): Promise<PaymentResult> {
    switch (payment.provider) {
      case PaymentProvider.STRIPE:
        return this.stripeService.confirmPayment(payment.providerPaymentId);

      case PaymentProvider.CULQI:
        return this.culqiService.getCharge(payment.providerPaymentId);

      case PaymentProvider.MERCADOPAGO:
        return this.mercadopagoService.getPayment(payment.providerPaymentId);

      default:
        return {
          success: false,
          paymentId: payment.id,
          status: PaymentStatus.FAILED,
          error: `Unsupported payment provider: ${payment.provider}`,
        };
    }
  }

  private async refundWithProvider(
    payment: Payment,
    amount?: number,
    reason?: string,
  ): Promise<PaymentResult> {
    switch (payment.provider) {
      case PaymentProvider.STRIPE:
        return this.stripeService.refundPayment(payment.providerPaymentId, amount, reason);

      case PaymentProvider.CULQI:
        return this.culqiService.refundCharge(payment.providerPaymentId, amount, reason);

      case PaymentProvider.MERCADOPAGO:
        return this.mercadopagoService.refundPayment(payment.providerPaymentId, amount);

      default:
        return {
          success: false,
          paymentId: payment.id,
          status: PaymentStatus.FAILED,
          error: `Unsupported payment provider: ${payment.provider}`,
        };
    }
  }

  private async processWebhookEvent(provider: PaymentProvider, webhookData: any): Promise<void> {
    // Process different webhook events based on provider and event type
    // This is a simplified implementation - in production, you'd handle specific events

    if (provider === PaymentProvider.STRIPE) {
      switch (webhookData.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(provider, webhookData.data.object.id);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(provider, webhookData.data.object.id);
          break;
      }
    }

    // Similar handling for other providers...
  }

  private async handlePaymentSuccess(provider: PaymentProvider, providerPaymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        provider,
        providerPaymentId,
      },
    });

    if (payment && payment.status !== PaymentStatus.COMPLETED) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          processedAt: new Date(),
        },
      });

      await this.ordersService.confirm(payment.orderId);
    }
  }

  private async handlePaymentFailure(provider: PaymentProvider, providerPaymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        provider,
        providerPaymentId,
      },
    });

    if (payment && payment.status === PaymentStatus.PENDING) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureCode: 'WEBHOOK_FAILURE',
          failureMessage: 'Payment failed according to webhook',
        },
      });
    }
  }

  // Utility methods
  async getPaymentStats(tenantId?: string) {
    const where: any = {};
    if (tenantId) {
      where.order = { tenantId };
    }

    const [total, completed, pending, failed] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.COMPLETED } }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.PENDING } }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.FAILED } }),
    ]);

    return {
      total,
      completed,
      pending,
      failed,
    };
  }
}