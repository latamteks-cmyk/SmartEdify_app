import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class ClientAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): Promise<boolean>;
}
