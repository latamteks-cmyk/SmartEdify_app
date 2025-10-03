import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { AssetEventListener } from './listeners/asset-event.listener';

@Module({
  providers: [EventsService, AssetEventListener],
  exports: [EventsService],
})
export class EventsModule {}