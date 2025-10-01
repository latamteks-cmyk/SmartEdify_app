import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { of } from 'rxjs';

export interface PolicyEvaluationRequest {
  tenantId: string;
  condominiumId: string;
  action: string;
  resource: string;
  subject: string;
  context: Record<string, any>;
}

export interface PolicyEvaluationResponse {
  decision: 'PERMIT' | 'DENY' | 'INDETERMINATE';
  obligations?: Array<{
    type: string;
    value: any;
  }>;
  advice?: Array<{
    type: string;
    value: any;
  }>;
  reason?: string;
  policyId?: string;
  version?: string;
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly circuitBreakerThreshold: number;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly circuitBreakerResetTime = 60000; // 1 minute

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('COMPLIANCE_SERVICE_URL', 'http://compliance-service:3012');
    this.timeout = this.configService.get<number>('COMPLIANCE_TIMEOUT_MS', 2000);
    this.circuitBreakerThreshold = this.configService.get<number>('COMPLIANCE_CIRCUIT_BREAKER_THRESHOLD', 5);
  }

  async evaluatePolicy(request: PolicyEvaluationRequest): Promise<PolicyEvaluationResponse> {
    // Circuit breaker check
    if (this.isCircuitOpen()) {
      this.logger.warn('Circuit breaker is open, using fail-safe mode');
      return this.getFailSafeResponse(request);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<PolicyEvaluationResponse>(
          `${this.baseUrl}/v1/policies/evaluate`,
          request,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Service-Name': 'reservation-service',
            },
          }
        ).pipe(
          timeout(this.timeout),
          catchError(error => {
            this.logger.error(`Policy evaluation failed: ${error.message}`, error.stack);
            this.recordFailure();
            return of(null);
          })
        )
      );

      if (!response || !response.data) {
        return this.getFailSafeResponse(request);
      }

      this.recordSuccess();
      return response.data;
    } catch (error) {
      this.logger.error(`Policy evaluation error: ${error.message}`, error.stack);
      this.recordFailure();
      return this.getFailSafeResponse(request);
    }
  }

  private isCircuitOpen(): boolean {
    if (this.failureCount < this.circuitBreakerThreshold) {
      return false;
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    if (timeSinceLastFailure > this.circuitBreakerResetTime) {
      this.logger.info('Circuit breaker reset time reached, attempting to close circuit');
      this.failureCount = 0;
      return false;
    }

    return true;
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.circuitBreakerThreshold) {
      this.logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  private recordSuccess(): void {
    if (this.failureCount > 0) {
      this.logger.info('Circuit breaker closed after successful request');
      this.failureCount = 0;
    }
  }

  private getFailSafeResponse(request: PolicyEvaluationRequest): PolicyEvaluationResponse {
    // Fail-safe logic based on resource type
    if (request.resource.includes('restricted') || request.resource.includes('admin')) {
      // Fail-closed for restricted resources
      return {
        decision: 'DENY',
        reason: 'Compliance service unavailable - fail-closed for restricted resource',
      };
    }

    // Fail-open for regular amenities with basic validation
    const basicValidation = this.performBasicValidation(request);
    if (!basicValidation.valid) {
      return {
        decision: 'DENY',
        reason: basicValidation.reason,
      };
    }

    return {
      decision: 'PERMIT',
      reason: 'Compliance service unavailable - fail-open with basic validation',
      obligations: [
        {
          type: 'LOG_FALLBACK_DECISION',
          value: 'Policy evaluation used fallback due to service unavailability',
        },
      ],
    };
  }

  private performBasicValidation(request: PolicyEvaluationRequest): { valid: boolean; reason?: string } {
    // Basic business rules validation
    const context = request.context;

    // Check basic time constraints
    if (context.startTime && context.endTime) {
      const start = new Date(context.startTime);
      const end = new Date(context.endTime);
      const now = new Date();

      if (start <= now) {
        return { valid: false, reason: 'Reservation start time must be in the future' };
      }

      if (end <= start) {
        return { valid: false, reason: 'Reservation end time must be after start time' };
      }

      // Maximum advance booking (90 days)
      const maxAdvance = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
      if (start > maxAdvance) {
        return { valid: false, reason: 'Reservation too far in advance' };
      }
    }

    // Check party size
    if (context.partySize && context.amenityCapacity) {
      if (context.partySize > context.amenityCapacity) {
        return { valid: false, reason: 'Party size exceeds amenity capacity' };
      }
    }

    return { valid: true };
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