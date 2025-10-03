import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async check() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkKafka(),
    ]);

    const database = checks[0].status === 'fulfilled' ? checks[0].value : { status: 'error', error: checks[0].reason };
    const kafka = checks[1].status === 'fulfilled' ? checks[1].value : { status: 'error', error: checks[1].reason };

    const overall = database.status === 'ok' && kafka.status === 'ok' ? 'ok' : 'error';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      service: 'notifications-service',
      version: '1.0.0',
      checks: {
        database,
        kafka,
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

  private async checkKafka() {
    try {
      // This would implement actual Kafka health check
      // For now, just return ok
      return { status: 'ok', responseTime: Date.now() };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}