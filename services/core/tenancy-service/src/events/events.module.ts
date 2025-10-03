import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { TenancyEventListener } from './listeners/tenancy-event.listener';

@Module({
  providers: [EventsService, TenancyEventListener],
  exports: [EventsService],
})
export class EventsModule {}