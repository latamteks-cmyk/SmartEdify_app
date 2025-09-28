import { Repository } from 'typeorm';
import { AuthorizationCodeStoreService } from './store/authorization-code-store.service';
import { TokensService } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { ParStoreService, ParPayload } from './store/par-store.service';
import { DeviceCodeStoreService } from './store/device-code-store.service';
import { RefreshToken } from '../tokens/entities/refresh-token.entity';
import { JtiStoreService } from './store/jti-store.service';
export declare class AuthService {
    private readonly authorizationCodeStore;
    private readonly tokensService;
    private readonly usersService;
    private readonly sessionsService;
    private readonly parStore;
    private readonly deviceCodeStore;
    private readonly jtiStore;
    private readonly refreshTokenRepository;
    constructor(authorizationCodeStore: AuthorizationCodeStoreService, tokensService: TokensService, usersService: UsersService, sessionsService: SessionsService, parStore: ParStoreService, deviceCodeStore: DeviceCodeStoreService, jtiStore: JtiStoreService, refreshTokenRepository: Repository<RefreshToken>);
    pushedAuthorizationRequest(payload: ParPayload): Promise<{
        request_uri: string;
        expires_in: number;
    }>;
    deviceAuthorizationRequest(): Promise<{
        device_code: string;
        user_code: string;
        verification_uri: string;
        expires_in: number;
        interval: number;
    }>;
    generateAuthorizationCode(params: {
        request_uri?: string;
        code_challenge?: string;
        code_challenge_method?: string;
        userId: string;
        scope: string;
    }): Promise<string>;
    exchangeCodeForTokens(code: string, code_verifier: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<[string, string]>;
    exchangeDeviceCodeForTokens(deviceCode: string): Promise<[string, string]>;
    revokeToken(token: string, token_type_hint?: string): Promise<void>;
    private _generateAccessToken;
    private _generateRefreshToken;
    introspect(token: string): Promise<any>;
    refreshTokens(refreshToken: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<[string, string]>;
    validateAccessToken(accessToken: string, userId: string, tenantId: string, issuedAt: Date): Promise<boolean>;
    validateDpopProof(dpopProof: string, httpMethod: string, httpUrl: string): Promise<string>;
}
