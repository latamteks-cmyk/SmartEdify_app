import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KafkaConfig {
  constructor(private configService: ConfigService) {}

  get brokers(): string[] {
    const brokersString = this.configService.get('KAFKA_BROKERS', 'localhost:9092');
    return brokersString.split(',');
  }

  get clientId(): string {
    return this.configService.get('KAFKA_CLIENT_ID', 'streaming-service');
  }

  get groupId(): string {
    return this.configService.get('KAFKA_GROUP_ID', 'streaming-service-group');
  }

  get options() {
    return {
      clientId: this.clientId,
      brokers: this.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    };
  }
}