import { Injectable } from '@nestjs/common';
import { PolicyEngineService } from './policy/policy-engine.service';

@Injectable()
export class AuthorizationService {
  constructor(private readonly policyEngine: PolicyEngineService) {}

  async checkPolicy(user: any, action: string, resource: any): Promise<boolean> {
    const policyName = `${resource.name}:${action}`;
    return this.policyEngine.evaluate(policyName, user, resource);
  }
}