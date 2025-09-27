import { Repository } from 'typeorm';
import { SigningKey } from '../entities/signing-key.entity';
import { KeyManagementService } from './key-management.service';
export declare class KeyRotationService {
    private readonly signingKeyRepository;
    private readonly keyManagementService;
    private readonly logger;
    constructor(signingKeyRepository: Repository<SigningKey>, keyManagementService: KeyManagementService);
    handleCron(): Promise<void>;
    private rotateExpiredActiveKeys;
    private expireRolledOverKeys;
}
