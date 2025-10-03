import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

import { Payment, PaymentStatus, PaymentProvider } from '../entities/payment.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { StripeService } from './providers/stripe.service';
import { CulqiService } from './providers/culqi.service';
import { MercadoPagoService } from './providers/mercadopago.service';

export interface CreatePaymentRequest {
  tenantId: string;
  orderId: string;
  userId: string;
  paymentMethodId?: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface PaymentCreatedEvent {
  paymentId: string;
  orderId: string;
  tenantId: string;
  userId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    private readonly stripeService: StripeService,
    private readonly culqiService: CulqiService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async createPayment(request: CreatePaymentRequest): Promise<Payment> {
    // Validate order exists and is payable
    const order = await this.orderRepository.findOne({
      where: { id: request.orderId, tenantId: request.tenantId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not in a payable state');
    }

    // Validate payment method if provided
    let paymentMethod: PaymentMethod | null = null;
    if (request.paymentMethodId) {
      paymentMethod = await this.paymentMethodRepository.findOne({
        where: { 
          id: request.paymentMethodId, 
          tenantId: request.tenantId,
          userId: request.userId,
          isActive: true,
        },
      });

      if (!paymentMethod) {
        throw new BadRequestException('Payment method not found or inactive');
      }
    }

    // Create payment record
    const payment = this.paymentRepository.create({
      tenantId: request.tenantId,
      userId: request.userId,
      orderId: request.orderId,
      paymentMethodId: request.paymentMethodId,
      provider: request.provider,
      amount: request.amount,
      currency: request.currency,
      status: PaymentStatus.PENDING,
      metadata: request.metadata || {},
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // Process payment with provider
    try {
      await this.processPaymentWithProvider(savedPayment, paymentMethod);
    } catch (error) {
      // Update payment status to failed
      savedPayment.status = PaymentStatus.FAILED;
      savedPayment.failureReason = error.message;
      await this.paymentRepository.save(savedPayment);
      throw error;
    }

    // Emit event
    this.eventEmitter.emit('payment.created', {
      paymentId: savedPayment.id,
      orderId: savedPayment.orderId,
      tenantId: savedPayment.tenantId,
      userId: savedPayment.userId,
      provider: savedPayment.provider,
      amount: savedPayment.amount,
      currency: savedPayment.currency,
      status: savedPayment.status,
    } as PaymentCreatedEvent);

    this.logger.log(`Payment created: ${savedPayment.id} for order ${request.orderId}`);
    return savedPayment;
  }

  async handleWebhook(provider: PaymentProvider, payload: any, signature: string): Promise<void> {
    this.logger.log(`Received webhook from ${provider}`);

    try {
      let paymentUpdate;

      switch (provider) {
        case PaymentProvider.STRIPE:
          paymentUpdate = await this.stripeService.handleWebhook(payload, signature);
          break;
        case PaymentProvider.CULQI:
          paymentUpdate = await this.culqiService.handleWebhook(payload, signature);
          break;
        case PaymentProvider.MERCADOPAGO:
          paymentUpdate = await this.mercadoPagoService.handleWebhook(payload, signature);
          break;
        default:
          throw new BadRequestException(`Unsupported provider: ${provider}`);
      }

      if (paymentUpdate) {
        await this.updatePaymentFromWebhook(paymentUpdate);
      }
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPayment(tenantId: string, paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, tenantId },
      relations: ['order', 'paymentMethod'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getOrderPayments(tenantId: string, orderId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { orderId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async refundPayment(
    tenantId: string,
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<Payment> {
    const payment = await this.getPayment(tenantId, paymentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    try {
      let refundResult;

      switch (payment.provider) {
        case PaymentProvider.STRIPE:
          refundResult = await this.stripeService.refundPayment(
            payment.providerPaymentId!,
            refundAmount,
            reason,
          );
          break;
        case PaymentProvider.CULQI:
          refundResult = await this.culqiService.refundPayment(
            payment.providerPaymentId!,
            refundAmount,
            reason,
          );
          break;
        case PaymentProvider.MERCADOPAGO:
          refundResult = await this.mercadoPagoService.refundPayment(
            payment.providerPaymentId!,
            refundAmount,
            reason,
          );
          break;
        default:
          throw new BadRequestException(`Refunds not supported for provider: ${payment.provider}`);
      }

      // Update payment status
      payment.status = PaymentStatus.REFUNDED;
      payment.metadata = {
        ...payment.metadata,
        refund: {
          amount: refundAmount,
          reason,
          refundId: refundResult.refundId,
          refundedAt: new Date().toISOString(),
        },
      };

      const updatedPayment = await this.paymentRepository.save(payment);

      // Emit event
      this.eventEmitter.emit('payment.refunded', {
        paymentId: payment.id,
        orderId: payment.orderId,
        tenantId: payment.tenantId,
        refundAmount,
        reason,
      });

      this.logger.log(`Payment refunded: ${paymentId}, amount: ${refundAmount}`);
      return updatedPayment;
    } catch (error) {
      this.logger.error(`Refund failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async processPaymentWithProvider(
    payment: Payment,
    paymentMethod: PaymentMethod | null,
  ): Promise<void> {
    try {
      let providerResult;

      switch (payment.provider) {
        case PaymentProvider.STRIPE:
          providerResult = await this.stripeService.createPayment({
            amount: payment.amount,
            currency: payment.currency,
            paymentMethodId: paymentMethod?.providerMethodId,
            metadata: {
              paymentId: payment.id,
              orderId: payment.orderId,
              tenantId: payment.tenantId,
            },
          });
          break;

        case PaymentProvider.CULQI:
          providerResult = await this.culqiService.createPayment({
            amount: payment.amount,
            currency: payment.currency,
            paymentMethodId: paymentMethod?.providerMethodId,
            metadata: {
              paymentId: payment.id,
              orderId: payment.orderId,
            },
          });
          break;

        case PaymentProvider.MERCADOPAGO:
          providerResult = await this.mercadoPagoService.createPayment({
            amount: payment.amount,
            currency: payment.currency,
            paymentMethodId: paymentMethod?.providerMethodId,
            metadata: {
              paymentId: payment.id,
              orderId: payment.orderId,
            },
          });
          break;

        default:
          throw new BadRequestException(`Unsupported payment provider: ${payment.provider}`);
      }

      // Update payment with provider response
      payment.providerPaymentId = providerResult.paymentId;
      payment.status = providerResult.status === 'succeeded' 
        ? PaymentStatus.COMPLETED 
        : PaymentStatus.PROCESSING;
      
      if (providerResult.status === 'succeeded') {
        payment.processedAt = new Date();
      }

      payment.metadata = {
        ...payment.metadata,
        provider: providerResult,
      };

      await this.paymentRepository.save(payment);

      // If payment completed, update order status
      if (payment.status === PaymentStatus.COMPLETED) {
        await this.updateOrderStatus(payment.orderId, OrderStatus.PAID);
      }
    } catch (error) {
      this.logger.error(`Payment processing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async updatePaymentFromWebhook(update: {
    providerPaymentId: string;
    status: PaymentStatus;
    transactionId?: string;
    failureReason?: string;
  }): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { providerPaymentId: update.providerPaymentId },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for provider ID: ${update.providerPaymentId}`);
      return;
    }

    const oldStatus = payment.status;
    payment.status = update.status;
    payment.providerTransactionId = update.transactionId;
    payment.failureReason = update.failureReason;

    if (update.status === PaymentStatus.COMPLETED && !payment.processedAt) {
      payment.processedAt = new Date();
    }

    await this.paymentRepository.save(payment);

    // Update order status if payment completed
    if (update.status === PaymentStatus.COMPLETED && oldStatus !== PaymentStatus.COMPLETED) {
      await this.updateOrderStatus(payment.orderId, OrderStatus.PAID);
    }

    // Emit status change event
    this.eventEmitter.emit('payment.status.changed', {
      paymentId: payment.id,
      orderId: payment.orderId,
      tenantId: payment.tenantId,
      oldStatus,
      newStatus: update.status,
    });

    this.logger.log(`Payment status updated: ${payment.id} -> ${update.status}`);
  }

  private async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    await this.orderRepository.update(orderId, { status });
    
    this.eventEmitter.emit('order.status.changed', {
      orderId,
      status,
      updatedAt: new Date(),
    });
  }
}