import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
export declare class TokensService {
    private refreshTokensRepository;
    constructor(refreshTokensRepository: Repository<RefreshToken>);
    issueRefreshToken(user: User, jkt: string, familyId?: string): Promise<string>;
    rotateRefreshToken(oldToken: string): Promise<string>;
    validateRefreshToken(token: string): Promise<User>;
}
