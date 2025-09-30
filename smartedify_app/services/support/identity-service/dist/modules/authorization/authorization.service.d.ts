import { PolicyEngineService } from './policy/policy-engine.service';
export declare class AuthorizationService {
    private readonly policyEngine;
    constructor(policyEngine: PolicyEngineService);
    checkPolicy(user: Record<string, unknown>, action: string, resource: Record<string, unknown>): boolean;
}
