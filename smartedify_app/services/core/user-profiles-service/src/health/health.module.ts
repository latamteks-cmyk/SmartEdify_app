import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { CacheModule } from '../modules/cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}