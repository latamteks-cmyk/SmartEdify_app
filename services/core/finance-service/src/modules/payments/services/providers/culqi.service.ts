import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '../../entities/payment.entity';

interface CulqiPaymentRequest {
  amount: number;
  currency: string;
  paymentMethodId?: string;
  metadata: Record<string, any>;
}

interface CulqiPaymentResponse {
  paymentId: string;
  status: 'succeeded' | 'processing' | 'failed';
  transactionId?: string;
}

interface CulqiRefundResponse {
  refundId: string;
  status: 'succeeded' | 'failed';
}

@Injectable()
export class CulqiService {
  private readonly logger = new Logger(CulqiService.name);
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('payments.culqi.secretKey', '');
    this.publicKey = this.configService.get<string>('payments.culqi.publicKey', '');
    this.enabled = this.configService.get<boolean>('payments.culqi.enabled', false);
  }

  async createPayment(request: CulqiPaymentRequest): Promise<CulqiPaymentResponse> {
    if (!this.enabled) {
      throw new Error('Culqi is not enabled');
    }

    this.logger.log(`Creating Culqi payment for amount: ${request.amount} ${request.currency}`);

    try {
      // Mock Culqi API call for development
      if (process.env.NODE_ENV === 'development') {
        return this.mockCulqiPayment(request);
      }

      // Real Culqi integration would go here
      const culqi = require('culqi-node')(this.secretKey);
      
      const charge = await culqi.charges.create({
        amount: Math.round(request.amount * 100), // Convert to centavos
        currency_code: request.currency.toUpperCase(),
        source_id: request.paymentMethodId,
        metadata: request.metadata,
      });

      return {
        paymentId: charge.id,
        status: this.mapCulqiStatus(charge.outcome.type),
        transactionId: charge.reference_code,
      };
    } catch (error) {
      this.logger.error(`Culqi payment failed: ${error.message}`, error.stack);
      throw new Error(`Culqi payment failed: ${error.message}`);
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
      // Verify webhook signature (Culqi uses HMAC)
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const event = JSON.parse(payload);

      switch (event.type) {
        case 'charge.succeeded':
          return {
            providerPaymentId: event.data.id,
            status: PaymentStatus.COMPLETED,
            transactionId: event.data.reference_code,
          };

        case 'charge.failed':
          return {
            providerPaymentId: event.data.id,
            status: PaymentStatus.FAILED,
            failureReason: event.data.outcome?.merchant_message,
          };

        default:
          this.logger.log(`Unhandled Culqi webhook event: ${event.type}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Culqi webhook processing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async refundPayment(
    paymentId: string,
    amount: number,
    reason?: string,
  ): Promise<CulqiRefundResponse> {
    if (!this.enabled) {
      throw new Error('Culqi is not enabled');
    }

    try {
      // Mock refund for development
      if (process.env.NODE_ENV === 'development') {
        return {
          refundId: `ref_mock_${Date.now()}`,
          status: 'succeeded',
        };
      }

      const culqi = require('culqi-node')(this.secretKey);
      
      const refund = await culqi.refunds.create({
        charge_id: paymentId,
        amount: Math.round(amount * 100), // Convert to centavos
        reason: reason || 'solicitud_comprador',
      });

      return {
        refundId: refund.id,
        status: 'succeeded', // Culqi refunds are typically immediate
      };
    } catch (error) {
      this.logger.error(`Culqi refund failed: ${error.message}`, error.stack);
      throw new Error(`Culqi refund failed: ${error.message}`);
    }
  }

  private mockCulqiPayment(request: CulqiPaymentRequest): CulqiPaymentResponse {
    // Mock successful payment for development
    const mockPaymentId = `chr_mock_${Date.now()}`;
    
    // Simulate different outcomes based on amount
    if (request.amount < 1) {
      return {
        paymentId: mockPaymentId,
        status: 'failed',
      };
    }

    // Culqi payments are typically immediate
    return {
      paymentId: mockPaymentId,
      status: 'succeeded',
      transactionId: `ref_${Date.now()}`,
    };
  }

  private mapCulqiStatus(culqiStatus: string): 'succeeded' | 'processing' | 'failed' {
    switch (culqiStatus) {
      case 'successful':
        return 'succeeded';
      case 'pending':
        return 'processing';
      case 'failed':
      case 'declined':
        return 'failed';
      default:
        return 'processing';
    }
  }

  private verifyWebhookSignature(payload: string, signature: string): boolean {
    if (process.env.NODE_ENV === 'development') {
      return true; // Skip verification in development
    }

    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      this.logger.error(`Culqi signature verification failed: ${error.message}`);
      return false;
    }
  }
}