import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '../../entities/payment.entity';

interface MercadoPagoPaymentRequest {
  amount: number;
  currency: string;
  paymentMethodId?: string;
  metadata: Record<string, any>;
}

interface MercadoPagoPaymentResponse {
  paymentId: string;
  status: 'succeeded' | 'processing' | 'failed';
  transactionId?: string;
}

interface MercadoPagoRefundResponse {
  refundId: string;
  status: 'succeeded' | 'failed';
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string;
  private readonly webhookSecret: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('payments.mercadopago.accessToken', '');
    this.webhookSecret = this.configService.get<string>('payments.mercadopago.webhookSecret', '');
    this.enabled = this.configService.get<boolean>('payments.mercadopago.enabled', false);
  }

  async createPayment(request: MercadoPagoPaymentRequest): Promise<MercadoPagoPaymentResponse> {
    if (!this.enabled) {
      throw new Error('MercadoPago is not enabled');
    }

    this.logger.log(`Creating MercadoPago payment for amount: ${request.amount} ${request.currency}`);

    try {
      // Mock MercadoPago API call for development
      if (process.env.NODE_ENV === 'development') {
        return this.mockMercadoPagoPayment(request);
      }

      // Real MercadoPago integration would go here
      const mercadopago = require('mercadopago');
      mercadopago.configure({
        access_token: this.accessToken,
      });

      const payment = await mercadopago.payment.create({
        transaction_amount: request.amount,
        token: request.paymentMethodId,
        description: 'SmartEdify Payment',
        installments: 1,
        payment_method_id: 'visa', // This would come from the payment method
        payer: {
          email: request.metadata.userEmail || 'user@smartedify.com',
        },
        metadata: request.metadata,
      });

      return {
        paymentId: payment.body.id.toString(),
        status: this.mapMercadoPagoStatus(payment.body.status),
        transactionId: payment.body.authorization_code,
      };
    } catch (error) {
      this.logger.error(`MercadoPago payment failed: ${error.message}`, error.stack);
      throw new Error(`MercadoPago payment failed: ${error.message}`);
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

      // MercadoPago sends different event types
      if (event.type === 'payment') {
        const paymentId = event.data.id;
        
        // Fetch payment details from MercadoPago API
        const mercadopago = require('mercadopago');
        mercadopago.configure({
          access_token: this.accessToken,
        });

        const payment = await mercadopago.payment.findById(paymentId);
        
        return {
          providerPaymentId: paymentId.toString(),
          status: this.mapMercadoPagoStatusToPaymentStatus(payment.body.status),
          transactionId: payment.body.authorization_code,
          failureReason: payment.body.status_detail,
        };
      }

      this.logger.log(`Unhandled MercadoPago webhook event: ${event.type}`);
      return null;
    } catch (error) {
      this.logger.error(`MercadoPago webhook processing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async refundPayment(
    paymentId: string,
    amount: number,
    reason?: string,
  ): Promise<MercadoPagoRefundResponse> {
    if (!this.enabled) {
      throw new Error('MercadoPago is not enabled');
    }

    try {
      // Mock refund for development
      if (process.env.NODE_ENV === 'development') {
        return {
          refundId: `refund_mock_${Date.now()}`,
          status: 'succeeded',
        };
      }

      const mercadopago = require('mercadopago');
      mercadopago.configure({
        access_token: this.accessToken,
      });

      const refund = await mercadopago.refund.create({
        payment_id: parseInt(paymentId),
        amount: amount,
      });

      return {
        refundId: refund.body.id.toString(),
        status: refund.body.status === 'approved' ? 'succeeded' : 'failed',
      };
    } catch (error) {
      this.logger.error(`MercadoPago refund failed: ${error.message}`, error.stack);
      throw new Error(`MercadoPago refund failed: ${error.message}`);
    }
  }

  private mockMercadoPagoPayment(request: MercadoPagoPaymentRequest): MercadoPagoPaymentResponse {
    // Mock successful payment for development
    const mockPaymentId = `mp_mock_${Date.now()}`;
    
    // Simulate different outcomes based on amount
    if (request.amount < 1) {
      return {
        paymentId: mockPaymentId,
        status: 'failed',
      };
    }

    if (request.amount > 5000) {
      return {
        paymentId: mockPaymentId,
        status: 'processing',
      };
    }

    return {
      paymentId: mockPaymentId,
      status: 'succeeded',
      transactionId: `auth_${Date.now()}`,
    };
  }

  private mapMercadoPagoStatus(mpStatus: string): 'succeeded' | 'processing' | 'failed' {
    switch (mpStatus) {
      case 'approved':
        return 'succeeded';
      case 'pending':
      case 'in_process':
      case 'in_mediation':
        return 'processing';
      case 'rejected':
      case 'cancelled':
      case 'refunded':
      case 'charged_back':
        return 'failed';
      default:
        return 'processing';
    }
  }

  private mapMercadoPagoStatusToPaymentStatus(mpStatus: string): PaymentStatus {
    switch (mpStatus) {
      case 'approved':
        return PaymentStatus.COMPLETED;
      case 'pending':
      case 'in_process':
      case 'in_mediation':
        return PaymentStatus.PROCESSING;
      case 'rejected':
      case 'cancelled':
        return PaymentStatus.FAILED;
      case 'refunded':
      case 'charged_back':
        return PaymentStatus.REFUNDED;
      default:
        return PaymentStatus.PROCESSING;
    }
  }

  private verifyWebhookSignature(payload: string, signature: string): boolean {
    if (process.env.NODE_ENV === 'development') {
      return true; // Skip verification in development
    }

    try {
      // MercadoPago webhook signature verification
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      this.logger.error(`MercadoPago signature verification failed: ${error.message}`);
      return false;
    }
  }
}