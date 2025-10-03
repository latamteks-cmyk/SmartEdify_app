import { Injectable, Logger } from '@nestjs/common';
import { PolicyEngineService } from './policy/policy-engine.service';

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(private readonly policyEngine: PolicyEngineService) {}

  checkPolicy(
    user: Record<string, unknown>,
    action: string,
    resource: Record<string, unknown>,
  ): boolean {
    const policyName = `${(resource.name as string) ?? 'unknown'}:${action}`;
    try {
      return this.policyEngine.evaluatePolicy(policyName, user, resource);
    } catch (error) {
      this.logger.error('Policy evaluation failed:', error);
      return false;
    }
  }
}
