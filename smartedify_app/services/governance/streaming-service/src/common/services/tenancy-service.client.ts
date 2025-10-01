import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface TenantLimits {
  maxConcurrentSessions: number;
  maxBitrateMbps: number;
  maxParticipantsPerSession: number;
  videoRetentionDays: number;
}

@Injectable()
export class TenancyServiceClient {
  private readonly logger = new Logger(TenancyServiceClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('TENANCY_SERVICE_URL', 'http://localhost:3003');
  }

  async getTenantLimits(tenantId: string): Promise<TenantLimits> {
    try {
      this.logger.debug(`Getting limits for tenant ${tenantId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/tenants/${tenantId}/streaming-limits`, {
          headers: {
            'X-Service-ID': 'streaming-service',
            'X-Internal-Service': 'true',
          },
          timeout: 5000,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get tenant limits for ${tenantId}`, error.message);
      
      // Return default limits if service is unavailable
      return {
        maxConcurrentSessions: this.configService.get('MAX_SESSIONS_PER_TENANT', 10),
        maxBitrateMbps: this.configService.get('MAX_BITRATE_MBPS', 2),
        maxParticipantsPerSession: 500,
        videoRetentionDays: this.configService.get('DEFAULT_VIDEO_RETENTION_DAYS', 1825),
      };
    }
  }

  async validateTenantAccess(tenantId: string): Promise<boolean> {
    try {
      this.logger.debug(`Validating access for tenant ${tenantId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/tenants/${tenantId}/status`, {
          headers: {
            'X-Service-ID': 'streaming-service',
            'X-Internal-Service': 'true',
          },
          timeout: 5000,
        })
      );

      return response.data.active === true;
    } catch (error) {
      this.logger.error(`Failed to validate tenant access for ${tenantId}`, error.message);
      return false;
    }
  }
}