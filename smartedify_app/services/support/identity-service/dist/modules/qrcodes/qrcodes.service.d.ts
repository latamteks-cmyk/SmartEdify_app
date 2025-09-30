import { KeyManagementService } from '../keys/services/key-management.service';
export declare class QrcodesService {
    private readonly keyManagementService;
    constructor(keyManagementService: KeyManagementService);
    generateQrCode(payload: Record<string, unknown>): Promise<string>;
    validateQrCode(token: string): Promise<Record<string, unknown>>;
}
