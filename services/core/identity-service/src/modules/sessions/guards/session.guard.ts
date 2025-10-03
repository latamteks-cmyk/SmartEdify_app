import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionsService } from '../sessions.service';

// Define the structure of the user object attached to the request
interface AuthenticatedUser {
  id: string;
  tenant_id: string;
  iat: number;
}

// Define the structure of the request object
interface RequestWithUser {
  user?: AuthenticatedUser;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessionsService: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: RequestWithUser = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user) {
      return false;
    }

    const notBeforeTime = await this.sessionsService.getNotBeforeTime(
      user.id,
      user.tenant_id,
    );
    if (notBeforeTime) {
      const tokenIat = user.iat; // Assuming iat is available in the user object from the JWT
      if (tokenIat * 1000 < notBeforeTime.getTime()) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return true;
  }
}
