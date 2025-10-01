import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No user information available');
    }

    // Check if user has admin role
    const roles = user.roles || [];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin') || user.role === 'admin';

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}