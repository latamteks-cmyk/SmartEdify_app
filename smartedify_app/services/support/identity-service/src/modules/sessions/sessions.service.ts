import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async revokeUserSessions(userId: string): Promise<void> {
    const revocationEvent = this.revocationEventsRepository.create({
        type: 'USER_LOGOUT',
        subject: userId,
        not_before: new Date(),
    });
    await this.revocationEventsRepository.save(revocationEvent);
  }

  async getNotBeforeTime(userId: string): Promise<Date | null> {
    const lastLogoutEvent = await this.revocationEventsRepository.findOne({
        where: { subject: userId, type: 'USER_LOGOUT' },
        order: { created_at: 'DESC' },
    });
    return lastLogoutEvent ? lastLogoutEvent.not_before : null;
  }
}