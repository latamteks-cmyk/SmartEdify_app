import { KeyManagementService } from '../keys/services/key-management.service';
export declare class QrcodesService {
    private readonly keysService;
    constructor(keysService: KeyManagementService);
    generateQrCode(payload: any): Promise<string>;
    validateQrCode(token: string): Promise<boolean>;
}
