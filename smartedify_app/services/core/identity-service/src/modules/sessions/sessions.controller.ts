import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  NotImplementedException,
  HttpCode,
  HttpStatus,
    Request,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('identity/v2')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('sessions/active')
  async getActiveSessions(@Request() req) {
    // Se asume que el guard de autenticación añade user y tenant_id al request
    const user = req.user;
    if (!user || !user.id || !user.tenant_id) {
      throw new NotImplementedException('No se encontró usuario autenticado en el contexto.');
    }
    return this.sessionsService.getActiveSessions(user.id, user.tenant_id);
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
