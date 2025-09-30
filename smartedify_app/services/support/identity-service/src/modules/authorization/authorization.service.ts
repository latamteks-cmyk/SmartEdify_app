import { Injectable } from '@nestjs/common';
import { PolicyEngineService } from './policy/policy-engine.service';

@Injectable()
export class AuthorizationService {
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
      console.error('Policy evaluation failed:', error);
      return false;
    }
  }
}
