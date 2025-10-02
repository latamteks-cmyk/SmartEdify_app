import { registerAs } from '@nestjs/config';

export default registerAs('kafka', () => ({
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
  clientId: process.env.KAFKA_CLIENT_ID || 'notifications-service',
  groupId: process.env.KAFKA_GROUP_ID || 'notifications-service-group',
  
  // Consumer configuration
  consumer: {
    sessionTimeout: parseInt(process.env.KAFKA_SESSION_TIMEOUT, 10) || 30000,
    rebalanceTimeout: parseInt(process.env.KAFKA_REBALANCE_TIMEOUT, 10) || 60000,
    heartbeatInterval: parseInt(process.env.KAFKA_HEARTBEAT_INTERVAL, 10) || 3000,
    maxBytesPerPartition: parseInt(process.env.KAFKA_MAX_BYTES_PER_PARTITION, 10) || 1048576,
    minBytes: parseInt(process.env.KAFKA_MIN_BYTES, 10) || 1,
    maxBytes: parseInt(process.env.KAFKA_MAX_BYTES, 10) || 10485760,
    maxWaitTimeInMs: parseInt(process.env.KAFKA_MAX_WAIT_TIME, 10) || 5000,
    retry: {
      initialRetryTime: parseInt(process.env.KAFKA_INITIAL_RETRY_TIME, 10) || 100,
      retries: parseInt(process.env.KAFKA_RETRIES, 10) || 8,
    },
  },
  
  // Producer configuration
  producer: {
    maxInFlightRequests: parseInt(process.env.KAFKA_MAX_IN_FLIGHT_REQUESTS, 10) || 1,
    idempotent: process.env.KAFKA_IDEMPOTENT === 'true',
    transactionTimeout: parseInt(process.env.KAFKA_TRANSACTION_TIMEOUT, 10) || 30000,
    retry: {
      initialRetryTime: parseInt(process.env.KAFKA_PRODUCER_INITIAL_RETRY_TIME, 10) || 100,
      retries: parseInt(process.env.KAFKA_PRODUCER_RETRIES, 10) || 5,
    },
  },
  
  // Topics
  topics: {
    notifications: process.env.KAFKA_NOTIFICATIONS_TOPIC || 'notifications',
    events: process.env.KAFKA_EVENTS_TOPIC || 'events',
    deadLetter: process.env.KAFKA_DEAD_LETTER_TOPIC || 'notifications-dead-letter',
  },
}));