import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelService } from './services/channel.service';
import { ChannelController } from './controllers/channel.controller';
import { NotificationChannel } from './entities/notification-channel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationChannel]),
  ],
  controllers: [ChannelController],
  providers: [ChannelService],
  exports: [ChannelService],
})
export class ChannelsModule {}