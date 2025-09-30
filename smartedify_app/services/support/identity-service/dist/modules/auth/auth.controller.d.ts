import { AuthService } from './auth.service';
import type { TokenIntrospectionResponse } from './auth.service';
import type { Request } from 'express';
import type { ParPayload } from './store/par-store.service';
import type { Response } from 'express';
interface TokenRequestBody {
    grant_type: string;
    code?: string;
    code_verifier?: string;
    refresh_token?: string;
    device_code?: string;
    [key: string]: string | undefined;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    pushedAuthorizationRequest(payload: ParPayload): {
        request_uri: string;
        expires_in: number;
    };
    deviceAuthorization(): {
        device_code: string;
        user_code: string;
        verification_uri: string;
        expires_in: number;
        interval: number;
    };
    authorize(res: Response, redirect_uri?: string, scope?: string, request_uri?: string, code_challenge?: string, code_challenge_method?: string): Response<any, Record<string, any>> | undefined;
    token(grant_type: string, body: TokenRequestBody, dpopProof: string, req: Request): Promise<{
        access_token: string;
        refresh_token: string;
        token_type: string;
    }>;
    revoke(token: string, token_type_hint?: string): Promise<{}>;
    introspect(token: string): TokenIntrospectionResponse;
}
export {};
