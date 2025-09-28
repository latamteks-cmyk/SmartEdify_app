import { Module } from '@nestjs/common';
import { ClientStoreService } from './client-store.service';

@Module({
  providers: [ClientStoreService],
  exports: [ClientStoreService],
})
export class ClientsModule {}
