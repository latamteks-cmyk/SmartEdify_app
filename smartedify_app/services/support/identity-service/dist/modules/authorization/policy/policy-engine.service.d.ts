export declare class PolicyEngineService {
    private policies;
    evaluatePolicy(policyName: string, user: Record<string, unknown>, resource: Record<string, unknown>): boolean;
}
