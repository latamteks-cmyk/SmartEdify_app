import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface GovernanceEventData {
  merkleRoot: string;
  commitHeight: number;
  assemblyId: string;
}

@Injectable()
export class GovernanceServiceClient {
  private readonly logger = new Logger(GovernanceServiceClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('GOVERNANCE_SERVICE_URL', 'http://localhost:3011');
  }

  async getAssemblyEventData(assemblyId: string, tenantId: string): Promise<GovernanceEventData | null> {
    try {
      this.logger.debug(`Getting event data for assembly ${assemblyId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/assemblies/${assemblyId}/event-data`, {
          headers: {
            'X-Service-ID': 'streaming-service',
            'X-Internal-Service': 'true',
            'X-Tenant-ID': tenantId,
          },
          timeout: 5000,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get assembly event data for ${assemblyId}`, error.message);
      return null;
    }
  }

  async notifySessionStarted(sessionId: string, assemblyId: string, tenantId: string): Promise<void> {
    try {
      this.logger.debug(`Notifying governance service of session start: ${sessionId}`);
      
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/v1/assemblies/${assemblyId}/session-started`, {
          sessionId,
          startedAt: new Date().toISOString(),
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-ID': 'streaming-service',
            'X-Internal-Service': 'true',
            'X-Tenant-ID': tenantId,
          },
          timeout: 5000,
        })
      );

      this.logger.debug(`Session start notification sent for ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to notify session start for ${sessionId}`, error.message);
      // Don't throw - this is a notification, not critical
    }
  }

  async notifySessionEnded(sessionId: string, assemblyId: string, tenantId: string, attendeeCount: number): Promise<void> {
    try {
      this.logger.debug(`Notifying governance service of session end: ${sessionId}`);
      
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/v1/assemblies/${assemblyId}/session-ended`, {
          sessionId,
          endedAt: new Date().toISOString(),
          attendeeCount,
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-ID': 'streaming-service',
            'X-Internal-Service': 'true',
            'X-Tenant-ID': tenantId,
          },
          timeout: 5000,
        })
      );

      this.logger.debug(`Session end notification sent for ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to notify session end for ${sessionId}`, error.message);
      // Don't throw - this is a notification, not critical
    }
  }
}