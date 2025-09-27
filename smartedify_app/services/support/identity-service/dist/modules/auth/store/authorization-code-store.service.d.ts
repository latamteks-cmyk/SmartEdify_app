interface AuthorizationCode {
    code_challenge: string;
    code_challenge_method: string;
}
export declare class AuthorizationCodeStoreService {
    private store;
    set(code: string, data: AuthorizationCode): void;
    get(code: string): AuthorizationCode | undefined;
}
export {};
