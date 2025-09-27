import { UsersService } from '../users/users.service';
export declare class MfaService {
    private readonly usersService;
    constructor(usersService: UsersService);
    generateSecret(userId: string): Promise<string>;
    generateOtpAuthUrl(userId: string, email: string, secret: string): Promise<string>;
    verify(userId: string, code: string): Promise<boolean>;
}
