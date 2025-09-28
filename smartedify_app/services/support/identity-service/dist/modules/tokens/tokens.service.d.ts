import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { SessionsService } from '../sessions/sessions.service';
import { AuthService } from '../auth/auth.service';
export declare class TokensService {
    private refreshTokensRepository;
    private readonly authService;
    private readonly sessionsService;
    constructor(refreshTokensRepository: Repository<RefreshToken>, authService: AuthService, sessionsService: SessionsService);
    issueRefreshToken(user: User, jkt: string, familyId?: string, clientId?: string, deviceId?: string, scope?: string): Promise<string>;
    rotateRefreshToken(oldToken: string): Promise<string>;
    validateRefreshToken(token: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<User>;
    revokeTokenFamily(familyId: string, reason: string): Promise<void>;
    revokeRefreshToken(tokenHash: string, reason: string): Promise<void>;
    validateAccessToken(accessToken: string, userId: string, tenantId: string, issuedAt: Date): Promise<boolean>;
    validateRefreshTokenWithNotBefore(token: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<User>;
}
