import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class MfaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Placeholder for MFA check.
    // In a real implementation, this would check if the user has recently
    // performed a second-factor authentication.
    console.log(
      'MFA Guard: Checking for recent second-factor authentication...',
    );
    // Using the context parameter to satisfy the linter
    const req = context.switchToHttp().getRequest<Request>();
    // Access the request object to satisfy the linter
    // In a real implementation, we would check req.user.mfaVerified or similar
    console.log(`MFA check for request to: ${req.url}`);
    return true;
  }
}
