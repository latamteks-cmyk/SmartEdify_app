import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { SessionsService } from '../sessions/sessions.service';
import { AuthService, ValidatedDpopProof } from '../auth/auth.service';
import { KeyManagementService } from '../keys/services/key-management.service';
import { JtiStoreService } from '../auth/store/jti-store.service';
export declare class TokensService {
    private refreshTokensRepository;
    private readonly authService;
    private readonly sessionsService;
    private readonly keyManagementService;
    private readonly jtiStore;
    constructor(refreshTokensRepository: Repository<RefreshToken>, authService: AuthService, sessionsService: SessionsService, keyManagementService: KeyManagementService, jtiStore: JtiStoreService);
    issueRefreshToken(user: User, jkt: string, familyId?: string, clientId?: string, deviceId?: string, scope?: string, sessionId?: string): Promise<string>;
    rotateRefreshToken(oldToken: string): Promise<string>;
    validateRefreshToken(token: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<{
        user: User;
        dpop: ValidatedDpopProof;
    }>;
    revokeTokenFamily(familyId: string, reason: string): Promise<void>;
    revokeRefreshToken(tokenHash: string, reason: string): Promise<void>;
    validateAccessToken(accessToken: string, userId: string, tenantId: string, issuedAt: Date): Promise<boolean>;
    validateRefreshTokenWithNotBefore(token: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<{
        user: User;
        dpop: ValidatedDpopProof;
    }>;
}
