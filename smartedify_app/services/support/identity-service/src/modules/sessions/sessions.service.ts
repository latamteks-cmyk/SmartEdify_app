import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Session } from './entities/session.entity';
import { RevocationEvent } from './entities/revocation-event.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    @InjectRepository(RevocationEvent)
    private revocationEventsRepository: Repository<RevocationEvent>,
  ) {}

  async revokeUserSessions(userId: string, tenantId: string): Promise<void> {
    // Find all active sessions for the user and mark them as revoked
    await this.sessionsRepository.update(
      { 
        user: { id: userId }, 
        tenant_id: tenantId, 
        revoked_at: IsNull() // Use IsNull() for proper TypeORM query
      },
      { revoked_at: new Date() },
    );

    // Create a global logout event for the user
    const revocationEvent = this.revocationEventsRepository.create({
        type: 'USER_LOGOUT',
        subject: userId,
        tenant_id: tenantId, // Include tenant_id
        not_before: new Date(),
    });
    await this.revocationEventsRepository.save(revocationEvent);
  }

  async revokeSession(sessionId: string): Promise<void> { // Removed reason for now
    await this.sessionsRepository.update(
      { id: sessionId },
      { revoked_at: new Date() },
    );
  }

  async getNotBeforeTime(userId: string, tenantId: string): Promise<Date | null> {
    const lastLogoutEvent = await this.revocationEventsRepository.findOne({
        where: { subject: userId, tenant_id: tenantId, type: 'USER_LOGOUT' },
        order: { created_at: 'DESC' },
    });
    return lastLogoutEvent ? lastLogoutEvent.not_before : null;
  }
}