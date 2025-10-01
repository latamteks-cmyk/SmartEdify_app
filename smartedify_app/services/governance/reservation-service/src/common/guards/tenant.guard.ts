import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenant_id) {
      throw new ForbiddenException('No tenant information in token');
    }

    // Set tenant context for RLS
    request.tenantId = user.tenant_id;
    
    return true;
  }
}