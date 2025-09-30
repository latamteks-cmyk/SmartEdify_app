import { UsersService } from '../users/users.service';
export declare class MfaService {
    private readonly usersService;
    constructor(usersService: UsersService);
    generateSecret(userId: string): string;
    generateOtpAuthUrl(userId: string, email: string, secret: string): string;
    verify(userId: string, code: string): Promise<boolean>;
}
