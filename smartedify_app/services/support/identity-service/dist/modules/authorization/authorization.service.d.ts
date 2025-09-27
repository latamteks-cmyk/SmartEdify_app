import { PolicyEngineService } from './policy/policy-engine.service';
export declare class AuthorizationService {
    private readonly policyEngine;
    constructor(policyEngine: PolicyEngineService);
    checkPolicy(user: any, action: string, resource: any): Promise<boolean>;
}
