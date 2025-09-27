import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../authorization.service';

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPolicies = this.reflector.get<string[]>('policies', context.getHandler());
    if (!requiredPolicies) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    // This is a placeholder for a real resource object
    const resource = { id: 'mock_resource' }; 
    
    for (const policy of requiredPolicies) {
        const [action, resourceName] = policy.split(':');
        const isAllowed = await this.authorizationService.checkPolicy(user, action, resource);
        if (!isAllowed) {
            return false;
        }
    }

    return true;
  }
}
