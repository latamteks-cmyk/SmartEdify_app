import { Repository } from 'typeorm';
import { AuthorizationCodeStoreService } from './store/authorization-code-store.service';
import { TokensService } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { ParStoreService, ParPayload } from './store/par-store.service';
export interface TokenIntrospectionResponse {
    active: boolean;
    sub?: string;
    scope?: string;
    exp?: number;
    iat?: number;
    client_id?: string;
    token_type?: string;
}
import { DeviceCodeStoreService } from './store/device-code-store.service';
import { RefreshToken } from '../tokens/entities/refresh-token.entity';
import { KeyManagementService } from '../keys/services/key-management.service';
import { JtiStoreService } from './store/jti-store.service';
import { ClientStoreService } from '../clients/client-store.service';
export interface ValidateDpopProofOptions {
    boundJkt?: string;
    requireBinding?: boolean;
}
export interface ValidatedDpopProof {
    jkt: string;
    jti: string;
    iat: number;
}
export declare class AuthService {
    private readonly authorizationCodeStore;
    private readonly tokensService;
    private readonly usersService;
    private readonly sessionsService;
    private readonly parStore;
    private readonly deviceCodeStore;
    private readonly jtiStore;
    private readonly keyManagementService;
    private readonly clientStore;
    private readonly refreshTokenRepository;
    private readonly logger;
    constructor(authorizationCodeStore: AuthorizationCodeStoreService, tokensService: TokensService, usersService: UsersService, sessionsService: SessionsService, parStore: ParStoreService, deviceCodeStore: DeviceCodeStoreService, jtiStore: JtiStoreService, keyManagementService: KeyManagementService, clientStore: ClientStoreService, refreshTokenRepository: Repository<RefreshToken>);
    pushedAuthorizationRequest(payload: ParPayload): {
        request_uri: string;
        expires_in: number;
    };
    getStoredPARRequest(requestUri: string): ParPayload | null;
    deviceAuthorizationRequest(): {
        device_code: string;
        user_code: string;
        verification_uri: string;
        expires_in: number;
        interval: number;
    };
    generateAuthorizationCode(params: {
        code_challenge: string;
        code_challenge_method: string;
        userId: string;
        scope: string;
    }): string;
    exchangeCodeForTokens(code: string, code_verifier: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<[string, string]>;
    exchangeDeviceCodeForTokens(deviceCode: string): [string, string];
    revokeToken(token: string, token_type_hint?: string): Promise<void>;
    private _generateAccessToken;
    private _generateRefreshToken;
    introspect(token: string): TokenIntrospectionResponse;
    refreshTokens(refreshToken: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<[string, string]>;
    validateAccessToken(accessToken: string, userId: string, tenantId: string, issuedAt: Date): Promise<boolean>;
    validateDpopProof(dpopProof: string, httpMethod: string, httpUrl: string, options?: ValidateDpopProofOptions): Promise<ValidatedDpopProof>;
    handleBackchannelLogout(logoutToken: string): Promise<void>;
}
