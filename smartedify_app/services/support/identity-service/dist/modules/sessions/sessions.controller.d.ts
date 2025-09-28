import { SessionsService } from './sessions.service';
export declare class SessionsController {
    private readonly sessionsService;
    constructor(sessionsService: SessionsService);
    logout(userId: string, tenantId: string): Promise<{
        message: string;
    }>;
}
