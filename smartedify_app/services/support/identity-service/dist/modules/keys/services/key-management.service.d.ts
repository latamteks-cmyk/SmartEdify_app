import { Repository } from 'typeorm';
import { SigningKey } from '../entities/signing-key.entity';
export declare class KeyManagementService {
    private readonly signingKeyRepository;
    private readonly logger;
    constructor(signingKeyRepository: Repository<SigningKey>);
    generateNewKey(tenantId: string): Promise<SigningKey>;
    getActiveSigningKey(tenantId: string): Promise<SigningKey>;
    findKeyById(kid: string): Promise<SigningKey | null>;
    getJwksForTenant(tenantId: string): Promise<{
        keys: object[];
    }>;
}
