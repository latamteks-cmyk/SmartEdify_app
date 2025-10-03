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
      this.checkS3(),
    ]);

    const database = checks[0].status === 'fulfilled' ? checks[0].value : { status: 'error', error: checks[0].reason };
    const s3 = checks[1].status === 'fulfilled' ? checks[1].value : { status: 'error', error: checks[1].reason };

    const overall = database.status === 'ok' && s3.status === 'ok' ? 'ok' : 'error';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      service: 'documents-service',
      version: '1.0.0',
      checks: {
        database,
        s3,
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

  private async checkS3() {
    try {
      // This would implement actual S3 health check
      // For now, just return ok if configuration is present
      const bucket = this.configService.get<string>('s3.bucket');
      return bucket ? { status: 'ok', responseTime: Date.now() } : { status: 'error', error: 'S3 not configured' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}