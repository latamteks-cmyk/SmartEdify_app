import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CacheService } from '../modules/cache/cache.service';

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async check() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const database = checks[0].status === 'fulfilled' ? checks[0].value : { status: 'error', error: checks[0].reason };
    const redis = checks[1].status === 'fulfilled' ? checks[1].value : { status: 'error', error: checks[1].reason };

    const overall = database.status === 'ok' && redis.status === 'ok' ? 'ok' : 'error';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      service: 'user-profiles-service',
      version: '1.0.0',
      checks: {
        database,
        redis,
      },
    };
  }

  async ready() {
    const health = await this.check();
    return {
      status: health.status === 'ok' ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
    };
  }

  async live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  private async checkDatabase() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', responseTime: Date.now() };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  private async checkRedis() {
    try {
      const testKey = 'health-check';
      await this.cacheService.set(testKey, 'ok', 10);
      const result = await this.cacheService.get(testKey);
      await this.cacheService.del(testKey);
      
      return result === 'ok' 
        ? { status: 'ok', responseTime: Date.now() }
        : { status: 'error', error: 'Redis test failed' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}