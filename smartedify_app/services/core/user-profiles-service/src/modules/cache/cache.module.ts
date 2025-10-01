import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from './cache.service';
import redisConfig from '../../config/redis.config';

@Module({
  imports: [
    ConfigModule.forFeature(redisConfig),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}