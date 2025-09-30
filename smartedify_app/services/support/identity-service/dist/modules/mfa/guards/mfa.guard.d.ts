import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class MfaGuard implements CanActivate {
    canActivate(_context: ExecutionContext): boolean;
}
