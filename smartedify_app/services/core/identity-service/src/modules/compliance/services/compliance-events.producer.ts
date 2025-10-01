import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka, Transport } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { ComplianceJobType } from '../types/compliance-job.enums';
import { COMPLIANCE_KAFKA_CLIENT } from '../tokens/compliance.tokens';

export interface ComplianceJobEventPayload {
  job_id: string;
  user_id: string;
  tenant_id: string;
  type: ComplianceJobType;
  requested_at: string;
  affected_services: string[];
  status_callback_url: string;
  result_callback_url?: string;
}

@Injectable()
export class ComplianceEventsProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ComplianceEventsProducer.name);
  private readonly kafkaDisabled = process.env.KAFKA_DISABLED === 'true';

  constructor(
    @Inject(COMPLIANCE_KAFKA_CLIENT)
    private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.kafkaDisabled) {
      this.logger.warn(
        'Kafka producer initialisation skipped because KAFKA_DISABLED=true',
      );
      return;
    }

    try {
      await this.kafkaClient.connect();
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer', error as Error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.kafkaDisabled) {
      return;
    }

    await this.kafkaClient.close();
  }

  async emitDataExportRequested(
    payload: ComplianceJobEventPayload,
  ): Promise<void> {
    await this.emitEvent('DataExportRequested', payload);
  }

  async emitDataDeletionRequested(
    payload: ComplianceJobEventPayload,
  ): Promise<void> {
    await this.emitEvent('DataDeletionRequested', payload);
  }

  private async emitEvent(
    topic: string,
    payload: ComplianceJobEventPayload,
  ): Promise<void> {
    if (this.kafkaDisabled) {
      this.logger.debug(`Kafka disabled, skipping emit for ${topic}`);
      return;
    }

    this.logger.debug(
      `Publishing ${topic} with payload ${JSON.stringify(payload)}`,
    );

    await lastValueFrom(this.kafkaClient.emit(topic, payload));
  }
}

export const kafkaClientConfig = () => ({
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: process.env.KAFKA_CLIENT_ID || 'identity-service-compliance',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092')
        .split(',')
        .map((broker) => broker.trim())
        .filter(Boolean),
    },
    producerOnlyMode: true,
  },
});
