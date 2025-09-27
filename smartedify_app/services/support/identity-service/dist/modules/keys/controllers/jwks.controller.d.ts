import { KeyManagementService } from '../services/key-management.service';
export declare class JwksController {
    private readonly keyManagementService;
    constructor(keyManagementService: KeyManagementService);
    getJwksForTenant(tenantId: string): Promise<{
        keys: object[];
    }>;
}
