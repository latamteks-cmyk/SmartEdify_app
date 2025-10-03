import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventSchemaService } from './services/event-schema.service';
import { EventSchemaController } from './controllers/event-schema.controller';
import { KafkaConsumerService } from './services/kafka-consumer.service';
import { EventSchema } from './entities/event-schema.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventSchema]),
    NotificationsModule,
  ],
  controllers: [EventSchemaController],
  providers: [EventSchemaService, KafkaConsumerService],
  exports: [EventSchemaService, KafkaConsumerService],
})
export class EventsModule {}