import { AuthService } from './auth.service';
import { Request } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    authorize(code_challenge: string, code_challenge_method: string): Promise<{
        code: string;
    }>;
    token(grant_type: string, code: string, code_verifier: string, dpopProof: string, req: Request): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    introspect(token: string): Promise<any>;
}
