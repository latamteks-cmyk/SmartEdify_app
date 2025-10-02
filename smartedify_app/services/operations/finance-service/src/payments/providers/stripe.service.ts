import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentProvider, PaymentStatus } from '@prisma/client';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
  metadata?: any;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  status: PaymentStatus;
  providerPaymentId?: string;
  clientSecret?: string;
  error?: string;
  metadata?: any;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-08-16',
      });
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'pen',
    metadata: any = {},
  ): Promise<PaymentResult> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe not configured');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`Created Stripe payment intent: ${paymentIntent.id}`);

      return {
        success: true,
        paymentId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        providerPaymentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        metadata: {
          stripePaymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      };
    } catch (error) {
      this.logger.error(`Stripe payment intent creation failed: ${error.message}`);
      return {
        success: false,
        paymentId: '',
        status: PaymentStatus.FAILED,
        error: error.message,
      };
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<PaymentResult> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe not configured');
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);

      this.logger.log(`Confirmed Stripe payment: ${paymentIntent.id}`);

      return {
        success: true,
        paymentId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        providerPaymentId: paymentIntent.id,
        metadata: {
          stripePaymentIntentId: paymentIntent.id,
        },
      };
    } catch (error) {
      this.logger.error(`Stripe payment confirmation failed: ${error.message}`);
      return {
        success: false,
        paymentId: paymentIntentId,
        status: PaymentStatus.FAILED,
        error: error.message,
      };
    }
  }

  async getPayment(paymentIntentId: string): Promise<PaymentResult> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe not configured');
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: true,
        paymentId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        providerPaymentId: paymentIntent.id,
        metadata: {
          stripePaymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      };
    } catch (error) {
      this.logger.error(`Stripe payment retrieval failed: ${error.message}`);
      return {
        success: false,
        paymentId: paymentIntentId,
        status: PaymentStatus.FAILED,
        error: error.message,
      };
    }
  }

  async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string,
  ): Promise<PaymentResult> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe not configured');
      }

      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason as any,
      });

      this.logger.log(`Created Stripe refund: ${refund.id}`);

      return {
        success: true,
        paymentId: refund.id,
        status: PaymentStatus.REFUNDED,
        providerPaymentId: refund.payment_intent as string,
        metadata: {
          stripeRefundId: refund.id,
          amount: refund.amount,
          status: refund.status,
        },
      };
    } catch (error) {
      this.logger.error(`Stripe refund failed: ${error.message}`);
      return {
        success: false,
        paymentId: paymentIntentId,
        status: PaymentStatus.FAILED,
        error: error.message,
      };
    }
  }

  async handleWebhook(payload: any, signature: string): Promise<any> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe not configured');
      }

      const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) {
        throw new Error('Stripe webhook secret not configured');
      }

      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      this.logger.log(`Received Stripe webhook: ${event.type}`);

      return {
        type: event.type,
        data: event.data,
        id: event.id,
      };
    } catch (error) {
      this.logger.error(`Stripe webhook handling failed: ${error.message}`);
      throw error;
    }
  }

  private mapStripeStatus(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return PaymentStatus.PENDING;
      case 'processing':
        return PaymentStatus.PROCESSING;
      case 'succeeded':
        return PaymentStatus.COMPLETED;
      case 'canceled':
        return PaymentStatus.CANCELLED;
      case 'requires_capture':
        return PaymentStatus.PROCESSING;
      default:
        return PaymentStatus.FAILED;
    }
  }

  getProvider(): PaymentProvider {
    return PaymentProvider.STRIPE;
  }

  isConfigured(): boolean {
    return !!this.stripe;
  }
}