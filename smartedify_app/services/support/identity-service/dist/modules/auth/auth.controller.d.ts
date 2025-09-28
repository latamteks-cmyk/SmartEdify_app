import { AuthService } from './auth.service';
import type { Request } from 'express';
import type { ParPayload } from './store/par-store.service';
import type { Response } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    pushedAuthorizationRequest(payload: ParPayload): Promise<{
        request_uri: string;
        expires_in: number;
    }>;
    deviceAuthorization(): Promise<{
        device_code: string;
        user_code: string;
        verification_uri: string;
        expires_in: number;
        interval: number;
    }>;
    authorize(res: Response, redirect_uri: string, scope: string, request_uri?: string, code_challenge?: string, code_challenge_method?: string): Promise<void>;
    token(grant_type: string, body: any, dpopProof: string, req: Request): Promise<{
        access_token: string;
        refresh_token: string;
        token_type: string;
    }>;
    revoke(token: string, token_type_hint?: string): Promise<{}>;
    introspect(token: string): Promise<any>;
}
