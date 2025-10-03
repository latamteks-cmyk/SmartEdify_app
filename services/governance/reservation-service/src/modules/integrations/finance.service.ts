import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { of } from 'rxjs';

export interface CreateOrderRequest {
  tenantId: string;
  condominiumId: string;
  userId: string;
  type: 'RESERVATION_FEE' | 'MAINTENANCE_FEE' | 'PENALTY' | 'SERVICE_FEE' | 'OTHER';
  amount: number;
  currency: string;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  expirationMinutes?: number;
}

export interface OrderResponse {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  status: 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';
  amount: number;
  currency: string;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  expiresAt?: string;
  createdAt: string;
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('services.finance.url', 'http://finance-service:3007');
    this.timeout = this.configService.get<number>('services.finance.timeout', 10000);
  }

  async createOrder(request: CreateOrderRequest, idempotencyKey: string): Promise<OrderResponse | null> {
    try {
      this.logger.log(`Creating order for reservation ${request.referenceId}, amount: ${request.amount} ${request.currency}`);

      const response = await firstValueFrom(
        this.httpService.post<OrderResponse>(
          `${this.baseUrl}/v1/orders`,
          request,
          {
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey,
              'X-Service-Name': 'reservation-service',
            },
          }
        ).pipe(
          timeout(this.timeout),
          catchError(error => {
            this.logger.error(`Order creation failed: ${error.message}`, error.stack);
            return of(null);
          })
        )
      );

      if (!response || !response.data) {
        this.logger.warn('Finance service returned empty response');
        return null;
      }

      this.logger.log(`Order created successfully: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Order creation error: ${error.message}`, error.stack);
      return null;
    }
  }

  async getOrder(tenantId: string, orderId: string): Promise<OrderResponse | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<OrderResponse>(
          `${this.baseUrl}/v1/orders/${orderId}`,
          {
            headers: {
              'X-Tenant-ID': tenantId,
              'X-Service-Name': 'reservation-service',
            },
          }
        ).pipe(
          timeout(this.timeout),
          catchError(error => {
            this.logger.error(`Get order failed: ${error.message}`);
            return of(null);
          })
        )
      );

      return response?.data || null;
    } catch (error) {
      this.logger.error(`Get order error: ${error.message}`, error.stack);
      return null;
    }
  }

  async cancelOrder(tenantId: string, orderId: string, reason?: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.baseUrl}/v1/orders/${orderId}/cancel`,
          { reason },
          {
            headers: {
              'X-Tenant-ID': tenantId,
              'X-Service-Name': 'reservation-service',
            },
          }
        ).pipe(
          timeout(this.timeout),
          catchError(error => {
            this.logger.error(`Cancel order failed: ${error.message}`);
            return of(null);
          })
        )
      );

      return response !== null;
    } catch (error) {
      this.logger.error(`Cancel order error: ${error.message}`, error.stack);
      return false;
    }
  }

  async getOrdersByReference(
    tenantId: string,
    referenceId: string,
    referenceType: string,
  ): Promise<OrderResponse[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<OrderResponse[]>(
          `${this.baseUrl}/v1/orders/reference/${referenceId}?referenceType=${referenceType}`,
          {
            headers: {
              'X-Tenant-ID': tenantId,
              'X-Service-Name': 'reservation-service',
            },
          }
        ).pipe(
          timeout(this.timeout),
          catchError(error => {
            this.logger.error(`Get orders by reference failed: ${error.message}`);
            return of({ data: [] });
          })
        )
      );

      return response?.data || [];
    } catch (error) {
      this.logger.error(`Get orders by reference error: ${error.message}`, error.stack);
      return [];
    }
  }

  async healthCheck(): Promise<{ status: string; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`).pipe(
          timeout(1000),
          catchError(error => of(null))
        )
      );

      const latency = Date.now() - startTime;
      return { status: 'healthy', latency };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        latency: Date.now() - startTime,
      };
    }
  }
}