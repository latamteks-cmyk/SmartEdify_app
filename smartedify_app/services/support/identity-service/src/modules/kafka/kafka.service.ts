import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private readonly isTestMode = process.env.NODE_ENV === 'test';

  constructor() {
    if (this.isTestMode) {
      this.logger.log('Running in test mode - Kafka disabled');
      // Mock producer for tests
      this.producer = {
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
        send: () => Promise.resolve([]),
      } as unknown as Producer;
    } else {
      this.kafka = new Kafka({
        clientId: 'identity-service',
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      });
      this.producer = this.kafka.producer();
    }
  }

  async onModuleInit() {
    if (!this.isTestMode) {
      await this.producer.connect();
    }
  }

  async onModuleDestroy() {
    if (!this.isTestMode) {
      await this.producer.disconnect();
    }
  }

  async publish(
    topic: string,
    message: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
    } catch (error) {
      this.logger.error(`Failed to publish message to topic '${topic}'`, error);
      // In a real application, you might want to add retry logic or a dead-letter queue.
      throw error;
    }
  }
}
