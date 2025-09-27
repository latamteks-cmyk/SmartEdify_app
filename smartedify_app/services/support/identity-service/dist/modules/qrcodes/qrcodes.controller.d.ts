import { QrcodesService } from './qrcodes.service';
export declare class QrcodesController {
    private readonly qrcodesService;
    constructor(qrcodesService: QrcodesService);
    generate(payload: any): Promise<{
        qrCodeDataUrl: string;
    }>;
    validate(token: string): Promise<{
        isValid: boolean;
    }>;
}
