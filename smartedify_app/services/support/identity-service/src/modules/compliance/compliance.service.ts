import { Injectable } from '@nestjs/common';
import { JobStoreService } from '../jobs/job-store.service';
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly jobStore: JobStoreService,
    private readonly kafkaService: KafkaService,
  ) {}

  async exportData(userId: string): Promise<string> {
    // Placeholder for starting an asynchronous data export job
    console.log(`Starting data export for user ${userId}`);
    const job = this.jobStore.create(userId);
    return job.job_id;
  }

  async deleteData(userId: string): Promise<string> {
    const job = this.jobStore.create(userId);

    // In a real implementation, this list would be based on a service registry
    const affectedServices = ['governance-service', 'user-profiles-service'];

    await this.kafkaService.publish('DataDeletionRequested', {
      user_id: userId,
      job_id: job.job_id,
      services: affectedServices,
    });

    return job.job_id;
  }
}
