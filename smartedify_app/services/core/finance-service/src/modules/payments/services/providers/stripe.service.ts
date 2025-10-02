import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '../../entities/payment.entity';

interface StripePaymentRequest {
  amount: number;
  currency: string;
  paymentMethodId?: string;
  metadata: Record<string, any>;
}

interface StripePaymentResponse {
  paymentId: string;
  status: 'succeeded' | 'processing' | 'failed';
  transactionId?: string;
}

interface StripeRefundResponse {
  refundId: string;
  status: 'succeeded' | 'failed';
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('payments.stripe.secretKey', '');
    this.webhookSecret = this.configService.get<string>('payments.stripe.webhookSecret', '');
    this.enabled = this.configService.get<boolean>('payments.stripe.enabled', false);
  }

  async createPayment(request: StripePaymentRequest): Promise<StripePaymentResponse> {
    if (!this.enabled) {
      throw new Error('Stripe is not enabled');
    }

    this.logger.log(`Creating Stripe payment for amount: ${request.amount} ${request.currency}`);

    try {
      // Mock Stripe API call for development
      if (process.env.NODE_ENV === 'development') {
        return this.mockStripePayment(request);
      }

      // Real Stripe integration would go here
      const stripe = require('stripe')(this.secretKey);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        payment_method: request.paymentMethodId,
        confirm: !!request.paymentMethodId,
        metadata: request.metadata,
      });

      return {
        paymentId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        transactionId: paymentIntent.charges?.data[0]?.id,
      };
    } catch (error) {
      this.logger.error(`Stripe payment failed: ${error.message}`, error.stack);
      throw new Error(`Stripe payment failed: ${error.message}`);
    }
  }

  async handleWebhook(payload: any, signature: string): Promise<{
    providerPaymentId: string;
    status: PaymentStatus;
    transactionId?: string;
    failureReason?: string;
  } | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const event = JSON.parse(payload);

      switch (event.type) {
        case 'payment_intent.succeeded':
          return {
            providerPaymentId: event.data.object.id,
            status: PaymentStatus.COMPLETED,
            transactionId: event.data.object.charges?.data[0]?.id,
          };

        case 'payment_intent.payment_failed':
          return {
            providerPaymentId: event.data.object.id,
            status: PaymentStatus.FAILED,
            failureReason: event.data.object.last_payment_error?.message,
          };

        case 'payment_intent.processing':
          return {
            providerPaymentId: event.data.object.id,
            status: PaymentStatus.PROCESSING,
          };

        default:
          this.logger.log(`Unhandled Stripe webhook event: ${event.type}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Stripe webhook processing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async refundPayment(
    paymentId: string,
    amount: number,
    reason?: string,
  ): Promise<StripeRefundResponse> {
    if (!this.enabled) {
      throw new Error('Stripe is not enabled');
    }

    try {
      // Mock refund for development
      if (process.env.NODE_ENV === 'development') {
        return {
          refundId: `re_mock_${Date.now()}`,
          status: 'succeeded',
        };
      }

      const stripe = require('stripe')(this.secretKey);
      
      const refund = await stripe.refunds.create({
        payment_intent: paymentId,
        amount: Math.round(amount * 100), // Convert to cents
        reason: reason || 'requested_by_customer',
      });

      return {
        refundId: refund.id,
        status: refund.status === 'succeeded' ? 'succeeded' : 'failed',
      };
    } catch (error) {
      this.logger.error(`Stripe refund failed: ${error.message}`, error.stack);
      throw new Error(`Stripe refund failed: ${error.message}`);
    }
  }

  private mockStripePayment(request: StripePaymentRequest): StripePaymentResponse {
    // Mock successful payment for development
    const mockPaymentId = `pi_mock_${Date.now()}`;
    
    // Simulate different outcomes based on amount
    if (request.amount < 1) {
      return {
        paymentId: mockPaymentId,
        status: 'failed',
      };
    }

    if (request.amount > 10000) {
      return {
        paymentId: mockPaymentId,
        status: 'processing',
      };
    }

    return {
      paymentId: mockPaymentId,
      status: 'succeeded',
      transactionId: `ch_mock_${Date.now()}`,
    };
  }

  private mapStripeStatus(stripeStatus: string): 'succeeded' | 'processing' | 'failed' {
    switch (stripeStatus) {
      case 'succeeded':
        return 'succeeded';
      case 'processing':
      case 'requires_action':
      case 'requires_confirmation':
        return 'processing';
      case 'canceled':
      case 'requires_payment_method':
        return 'failed';
      default:
        return 'processing';
    }
  }

  private verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Stripe webhook secret not configured, skipping signature verification');
      return true; // Allow in development
    }

    try {
      // In development, always return true
      if (process.env.NODE_ENV === 'development') {
        return true;
      }

      // Real signature verification would use Stripe's library
      const stripe = require('stripe')(this.secretKey);
      stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch (error) {
      this.logger.error(`Stripe signature verification failed: ${error.message}`);
      return false;
    }
  }
}