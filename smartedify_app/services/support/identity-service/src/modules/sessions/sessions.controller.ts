import { Controller, Post, Body } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('logout')
  async logout(@Body('user_id') userId: string) {
    await this.sessionsService.revokeUserSessions(userId);
    return { message: 'All sessions have been logged out.' };
  }
}
