import { Controller, Post, Body } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('logout')
  async logout(@Body('user_id') userId: string, @Body('tenant_id') tenantId: string) { // Added tenantId
    // In a real application, tenantId would be extracted from the authenticated user's context (e.g., JWT)
    // For now, we'll assume it's passed in the body or use a mock value if not provided.
    if (!tenantId) {
      // This is a placeholder. In a real app, you'd get this from auth context.
      tenantId = 'mock-tenant-id'; 
    }
    await this.sessionsService.revokeUserSessions(userId, tenantId);
    return { message: 'All sessions have been logged out.' };
  }
}