import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  NotImplementedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('identity/v2')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('sessions/active')
  getActiveSessions() {
    // TODO: Implement logic to retrieve active sessions for the authenticated user.
    throw new NotImplementedException('Get active sessions not implemented.');
  }

  @Post('sessions/:id/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Param('id') sessionId: string) {
    await this.sessionsService.revokeSession(sessionId);
    return { message: `Session ${sessionId} has been revoked.` };
  }

  @Post('subject/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeSubject(
    @Body('user_id') userId: string,
    @Body('tenant_id') tenantId: string,
  ) {
    // In a real application, tenantId and userId would be from the auth context
    if (!tenantId) {
      tenantId = 'mock-tenant-id';
    }
    await this.sessionsService.revokeUserSessions(userId, tenantId);
    return { message: `All sessions for subject ${userId} have been revoked.` };
  }
}
