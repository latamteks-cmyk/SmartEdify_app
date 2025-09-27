import { AuthorizationCodeStoreService } from './store/authorization-code-store.service';
import { TokensService } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private readonly authorizationCodeStore;
    private readonly tokensService;
    private readonly usersService;
    constructor(authorizationCodeStore: AuthorizationCodeStoreService, tokensService: TokensService, usersService: UsersService);
    generateAuthorizationCode(code_challenge: string, code_challenge_method: string, userId: string): Promise<string>;
    generateAccessToken(code: string, code_verifier: string, dpopProof: string, httpMethod: string, httpUrl: string): Promise<string>;
    generateRefreshToken(code: string): Promise<string>;
    introspect(token: string): Promise<any>;
    private validateDpopProof;
}
