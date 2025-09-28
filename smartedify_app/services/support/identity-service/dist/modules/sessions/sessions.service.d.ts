import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { RevocationEvent } from './entities/revocation-event.entity';
export declare class SessionsService {
    private sessionsRepository;
    private revocationEventsRepository;
    constructor(sessionsRepository: Repository<Session>, revocationEventsRepository: Repository<RevocationEvent>);
    revokeUserSessions(userId: string, tenantId: string): Promise<void>;
    revokeSession(sessionId: string): Promise<void>;
    getNotBeforeTime(userId: string, tenantId: string): Promise<Date | null>;
}
