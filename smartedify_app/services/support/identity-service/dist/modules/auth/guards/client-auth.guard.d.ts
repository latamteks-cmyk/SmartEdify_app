import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ClientStoreService } from '../../clients/client-store.service';
export declare class ClientAuthGuard implements CanActivate {
    private readonly clientStore;
    constructor(clientStore: ClientStoreService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
