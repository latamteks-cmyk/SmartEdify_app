import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface ContextualTokenValidationRequest {
  code: string;
  sessionId: string;
  userId: string;
  tenantId: string;
}

export interface BiometricValidationRequest {
  biometricData: string;
  sessionId: string;
  userId: string;
  tenantId: string;
}

export interface CodeValidationRequest {
  code: string;
  method: 'sms' | 'email';
  sessionId: string;
  userId: string;
  tenantId: string;
}

export interface ValidationResponse {
  valid: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class IdentityServiceClient {
  private readonly logger = new Logger(IdentityServiceClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('IDENTITY_SERVICE_URL', 'http://localhost:3001');
  }

  async validateContextualToken(request: ContextualTokenValidationRequest): Promise<ValidationResponse> {
    try {
      this.logger.debug(`Validating contextual token for user ${request.userId}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/v2/contextual-tokens/validate`, request, {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-ID': 'streaming-service',
            'X-Internal-Service': 'true',
            'X-Tenant-ID': request.tenantId,
          },
          timeout: 5000,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to validate contextual token', error.message);
      return { valid: false, reason: 'Service communication error' };
    }
  }

  async validateBiometric(request: BiometricValidationRequest): Promise<ValidationResponse> {
    try {
      this.logger.debug(`Validating biometric for user ${request.userId}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/v2/biometric/validate`, request, {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-ID': 'streaming-service',
            'X-Internal-Service': 'true',
            'X-Tenant-ID': request.tenantId,
          },
          timeout: 10000, // Biometric validation might take longer
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to validate biometric', error.message);
      return { valid: false, reason: 'Service communication error' };
    }
  }

  async validateCode(request: CodeValidationRequest): Promise<ValidationResponse> {
    try {
      this.logger.debug(`Validating ${request.method} code for user ${request.userId}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/v2/codes/validate`, request, {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-ID': 'streaming-service',
            'X-Internal-Service': 'true',
            'X-Tenant-ID': request.tenantId,
          },
          timeout: 5000,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to validate ${request.method} code`, error.message);
      return { valid: false, reason: 'Service communication error' };
    }
  }
}