import { Module } from '@nestjs/common';
import { VideoProvidersService } from './video-providers.service';

@Module({
  providers: [VideoProvidersService],
  exports: [VideoProvidersService],
})
export class VideoProvidersModule {}