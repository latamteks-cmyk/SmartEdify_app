import { SessionsService } from './sessions.service';
export declare class SessionsController {
    private readonly sessionsService;
    constructor(sessionsService: SessionsService);
    getActiveSessions(): Promise<void>;
    revokeSession(sessionId: string): Promise<{
        message: string;
    }>;
    revokeSubject(userId: string, tenantId: string): Promise<{
        message: string;
    }>;
}
