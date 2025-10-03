import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './controllers/notification.controller';
import { Notification } from './entities/notification.entity';
import { NotificationHistory } from './entities/notification-history.entity';
import { TemplatesModule } from '../templates/templates.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationHistory]),
    TemplatesModule,
    ChannelsModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}