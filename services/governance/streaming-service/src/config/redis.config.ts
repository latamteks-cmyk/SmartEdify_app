import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisConfig {
  constructor(private configService: ConfigService) {}

  get host(): string {
    return this.configService.get('REDIS_HOST', 'localhost');
  }

  get port(): number {
    return this.configService.get('REDIS_PORT', 6379);
  }

  get password(): string {
    return this.configService.get('REDIS_PASSWORD', '');
  }

  get db(): number {
    return this.configService.get('REDIS_DB', 0);
  }

  get options() {
    return {
      host: this.host,
      port: this.port,
      password: this.password || undefined,
      db: this.db,
      retryAttempts: 3,
      retryDelay: 3000,
    };
  }
}