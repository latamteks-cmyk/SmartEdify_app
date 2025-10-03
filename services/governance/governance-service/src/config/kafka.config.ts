import { registerAs } from '@nestjs/config';

export const KafkaConfig = registerAs('kafka', () => ({
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
  clientId: process.env.KAFKA_CLIENT_ID || 'governance-service',
  groupId: process.env.KAFKA_GROUP_ID || 'governance-service-group',
}));