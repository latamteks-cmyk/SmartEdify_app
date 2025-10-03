import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor(private configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: this.configService.get('KAFKA_CLIENT_ID', 'streaming-service'),
      brokers: this.configService.get('KAFKA_BROKERS', 'localhost:9092').split(','),
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: this.configService.get('KAFKA_GROUP_ID', 'streaming-service-group'),
    });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.logger.log('Kafka producer and consumer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Kafka', error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.logger.log('Kafka connections closed');
    } catch (error) {
      this.logger.error('Error closing Kafka connections', error);
    }
  }

  async emit(topic: string, message: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: message.sessionId || message.id,
            value: JSON.stringify({
              ...message,
              timestamp: new Date().toISOString(),
              service: 'streaming-service',
              version: '2.2.0',
            }),
            headers: {
              'content-type': 'application/json',
              'schema-version': 'v1',
            },
          },
        ],
      });

      this.logger.debug(`Message sent to topic ${topic}`, { messageId: message.id });
    } catch (error) {
      this.logger.error(`Failed to send message to topic ${topic}`, error);
      throw error;
    }
  }

  async subscribe(topic: string, callback: (message: any) => Promise<void>): Promise<void> {
    try {
      await this.consumer.subscribe({ topic, fromBeginning: false });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const value = message.value?.toString();
            if (value) {
              const parsedMessage = JSON.parse(value);
              await callback(parsedMessage);
            }
          } catch (error) {
            this.logger.error(`Error processing message from topic ${topic}`, error);
          }
        },
      });

      this.logger.log(`Subscribed to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}`, error);
      throw error;
    }
  }
}