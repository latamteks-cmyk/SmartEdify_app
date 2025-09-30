import { QrcodesService } from './qrcodes.service';
interface GenerateContextualTokenDto {
    event_id: string;
    location: string;
    audience: string;
    expires_in?: number;
}
interface ValidateContextualTokenDto {
    token: string;
    audience: string;
}
export declare class QrcodesController {
    private readonly qrcodesService;
    constructor(qrcodesService: QrcodesService);
    generateContextualToken(request: GenerateContextualTokenDto): Promise<{
        qr_code: string;
        token: {
            iss: string;
            aud: string;
            sub: string;
            jti: string;
            nbf: number;
            exp: number;
            event_id: string;
            location: string;
        };
        expires_at: string;
    }>;
    validateContextualToken(request: ValidateContextualTokenDto): Promise<{
        valid: boolean;
        payload: Record<string, unknown>;
        message: string;
        error?: undefined;
    } | {
        valid: boolean;
        error: string;
        message: string;
        payload?: undefined;
    }>;
}
export {};
