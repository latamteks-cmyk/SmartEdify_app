import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CacheService } from '../../cache/cache.service';

interface PolicyEvaluationRequest {
  tenantId: string;
  userId: string;
  resource: string;
  action: string;
  context?: Record<string, any>;
}

interface PolicyEvaluationResponse {
  decision: 'PERMIT' | 'DENY';
  obligations?: string[];
  advice?: string[];
  metadata?: Record<string, any>;
}

@Injectable()
export class ComplianceIntegrationService {
  private readonly logger = new Logger(ComplianceIntegrationService.name);
  private readonly complianceServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.complianceServiceUrl = this.configService.get<string>('COMPLIANCE_SERVICE_URL') || 'http://compliance-service:3012';
  }

  async evaluatePermission(request: PolicyEvaluationRequest): Promise<PolicyEvaluationResponse> {
    const cacheKey = this.getPermissionCacheKey(request);
    
    // Try cache first
    const cached = await this.cacheService.get<PolicyEvaluationResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Permission cache hit for ${request.userId}:${request.resource}:${request.action}`);
      return cached;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.complianceServiceUrl}/policies/evaluate`, {
          tenantId: request.tenantId,
          subject: {
            type: 'USER',
            id: request.userId,
          },
          resource: {
            type: request.resource,
            id: request.context?.resourceId,
          },
          action: request.action,
          context: request.context || {},
        })
      );

      const result = response.data;
      
      // Cache the result for 5 minutes
      await this.cacheService.set(cacheKey, result, 300);
      
      this.logger.debug(`Permission evaluated for ${request.userId}:${request.resource}:${request.action} = ${result.decision}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error evaluating permission: ${error.message}`, error.stack);
      
      // Return DENY on error for security
      return {
        decision: 'DENY',
        metadata: { error: 'Compliance service unavailable' },
      };
    }
  }

  async batchEvaluatePermissions(requests: PolicyEvaluationRequest[]): Promise<PolicyEvaluationResponse[]> {
    try {
      const batchRequest = requests.map(req => ({
        tenantId: req.tenantId,
        subject: {
          type: 'USER',
          id: req.userId,
        },
        resource: {
          type: req.resource,
          id: req.context?.resourceId,
        },
        action: req.action,
        context: req.context || {},
      }));

      const response = await firstValueFrom(
        this.httpService.post(`${this.complianceServiceUrl}/policies/batch-evaluate`, {
          requests: batchRequest,
        })
      );

      return response.data.results;
    } catch (error) {
      this.logger.error(`Error in batch permission evaluation: ${error.message}`, error.stack);
      
      // Return DENY for all requests on error
      return requests.map(() => ({
        decision: 'DENY' as const,
        metadata: { error: 'Compliance service unavailable' },
      }));
    }
  }

  async validateAssemblyParticipation(
    tenantId: string,
    userId: string,
    assemblyId: string,
  ): Promise<{ canParticipate: boolean; reason?: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.complianceServiceUrl}/compliance/validate`, {
          tenantId,
          validationType: 'ASSEMBLY',
          entityId: assemblyId,
          context: {
            userId,
            action: 'PARTICIPATE',
          },
        })
      );

      return {
        canParticipate: response.data.isValid,
        reason: response.data.validationResult?.reason,
      };
    } catch (error) {
      this.logger.error(`Error validating assembly participation: ${error.message}`, error.stack);
      return {
        canParticipate: false,
        reason: 'Validation service unavailable',
      };
    }
  }

  async validateQuorumRequirements(
    tenantId: string,
    condominiumId: string,
    participantUserIds: string[],
  ): Promise<{ isValid: boolean; details: any }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.complianceServiceUrl}/compliance/validate`, {
          tenantId,
          validationType: 'QUORUM',
          entityId: condominiumId,
          context: {
            participantUserIds,
            action: 'VALIDATE_QUORUM',
          },
        })
      );

      return {
        isValid: response.data.isValid,
        details: response.data.validationResult,
      };
    } catch (error) {
      this.logger.error(`Error validating quorum: ${error.message}`, error.stack);
      return {
        isValid: false,
        details: { error: 'Validation service unavailable' },
      };
    }
  }

  async validateVotingRights(
    tenantId: string,
    userId: string,
    assemblyId: string,
  ): Promise<{ hasVotingRights: boolean; votingWeight?: number; reason?: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.complianceServiceUrl}/compliance/validate`, {
          tenantId,
          validationType: 'MAJORITY',
          entityId: assemblyId,
          context: {
            userId,
            action: 'VOTE',
          },
        })
      );

      return {
        hasVotingRights: response.data.isValid,
        votingWeight: response.data.validationResult?.votingWeight,
        reason: response.data.validationResult?.reason,
      };
    } catch (error) {
      this.logger.error(`Error validating voting rights: ${error.message}`, error.stack);
      return {
        hasVotingRights: false,
        reason: 'Validation service unavailable',
      };
    }
  }

  async invalidateUserPermissionCache(tenantId: string, userId: string): Promise<void> {
    const pattern = `${this.configService.get('redis.keyPrefix')}permission:${tenantId}:${userId}:*`;
    await this.cacheService.delPattern(pattern);
    this.logger.debug(`Invalidated permission cache for user ${userId} in tenant ${tenantId}`);
  }

  private getPermissionCacheKey(request: PolicyEvaluationRequest): string {
    const contextHash = request.context ? 
      Buffer.from(JSON.stringify(request.context)).toString('base64') : 
      'no-context';
    
    return `${this.configService.get('redis.keyPrefix')}permission:${request.tenantId}:${request.userId}:${request.resource}:${request.action}:${contextHash}`;
  }
}