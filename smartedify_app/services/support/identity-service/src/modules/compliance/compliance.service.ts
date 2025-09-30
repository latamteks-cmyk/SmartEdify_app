import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplianceJob } from './entities/compliance-job.entity';
import { ComplianceJobService } from './entities/compliance-job-service.entity';
import {
  ComplianceJobServiceStatus,
  ComplianceJobStatus,
  ComplianceJobType,
} from './types/compliance-job.enums';
import { RequestComplianceJobDto } from './dto/request-compliance-job.dto';
import { ComplianceJobCallbackDto } from './dto/compliance-job-callback.dto';
import {
  ComplianceEventsProducer,
  ComplianceJobEventPayload,
} from './services/compliance-events.producer';
import { SessionsService } from '../sessions/sessions.service';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);
  private readonly statusCallbackBaseUrl: string;

  constructor(
    @InjectRepository(ComplianceJob)
    private readonly jobsRepository: Repository<ComplianceJob>,
    @InjectRepository(ComplianceJobService)
    private readonly jobServicesRepository: Repository<ComplianceJobService>,
    private readonly sessionsService: SessionsService,
    private readonly eventsProducer: ComplianceEventsProducer,
  ) {
    this.statusCallbackBaseUrl = (
      process.env.COMPLIANCE_JOB_CALLBACK_BASE_URL ||
      'http://identity-service:3001/privacy/jobs'
    ).replace(/\/$/, '');
  }

  async exportData(dto: RequestComplianceJobDto): Promise<ComplianceJob> {
    const services = this.normaliseServices(
      dto.affected_services ?? ['governance-service'],
    );
    return this.createJob(ComplianceJobType.DATA_EXPORT, dto, services);
  }

  async deleteData(dto: RequestComplianceJobDto): Promise<ComplianceJob> {
    const services = this.normaliseServices(
      dto.affected_services ?? ['governance-service', 'sessions-service'],
    );
    return this.createJob(ComplianceJobType.DATA_DELETION, dto, services);
  }

  async handleJobCallback(
    jobId: string,
    callback: ComplianceJobCallbackDto,
  ): Promise<ComplianceJob> {
    const job = await this.jobsRepository.findOne({
      where: { id: jobId },
      relations: ['services'],
    });

    if (!job) {
      throw new NotFoundException(`Compliance job ${jobId} not found`);
    }

    const serviceRecord = job.services?.find(
      (service) => service.service_name === callback.service_name,
    );

    if (!serviceRecord) {
      throw new BadRequestException(
        `Service ${callback.service_name} is not registered for job ${jobId}`,
      );
    }

    if (this.isTerminal(serviceRecord.status)) {
      this.logger.debug(
        `Ignoring callback for job ${jobId} service ${serviceRecord.service_name} because it is already ${serviceRecord.status}`,
      );
      return this.refreshJobStatus(jobId);
    }

    serviceRecord.status = callback.status;
    serviceRecord.error_message = callback.error_message;
    serviceRecord.metadata = callback.metadata;
    serviceRecord.completed_at = this.isTerminal(callback.status)
      ? new Date()
      : serviceRecord.completed_at;

    await this.jobServicesRepository.save(serviceRecord);

    const refreshedJob = await this.refreshJobStatus(jobId);

    if (
      callback.service_name === 'sessions-service' &&
      callback.status === ComplianceJobServiceStatus.COMPLETED
    ) {
      await this.ensureSessionsRevoked(refreshedJob);
    }

    return refreshedJob;
  }

  private async createJob(
    type: ComplianceJobType,
    dto: RequestComplianceJobDto,
    services: string[],
  ): Promise<ComplianceJob> {
    if (!services.length) {
      throw new BadRequestException(
        'At least one affected service is required',
      );
    }

    const jobEntity = this.jobsRepository.create({
      user_id: dto.user_id,
      tenant_id: dto.tenant_id,
      type,
      status: ComplianceJobStatus.PENDING,
      affected_services: services,
      status_callback_url: '',
      result_callback_url: dto.result_callback_url,
    });

    let persistedJob = await this.jobsRepository.save(jobEntity);
    persistedJob.status_callback_url = this.buildStatusCallbackUrl(
      persistedJob.id,
    );
    persistedJob = await this.jobsRepository.save(persistedJob);

    await this.registerServices(persistedJob, services);
    await this.triggerInternalCoordinations(persistedJob);

    await this.publishEvent(type, persistedJob);

    return this.refreshJobStatus(persistedJob.id);
  }

  private async publishEvent(
    type: ComplianceJobType,
    job: ComplianceJob,
  ): Promise<void> {
    const payload: ComplianceJobEventPayload = {
      job_id: job.id,
      user_id: job.user_id,
      tenant_id: job.tenant_id,
      type,
      requested_at: job.created_at.toISOString(),
      affected_services: job.affected_services,
      status_callback_url: job.status_callback_url,
      result_callback_url: job.result_callback_url,
    };

    if (type === ComplianceJobType.DATA_EXPORT) {
      await this.eventsProducer.emitDataExportRequested(payload);
    } else {
      await this.eventsProducer.emitDataDeletionRequested(payload);
    }
  }

  private async registerServices(
    job: ComplianceJob,
    services: string[],
  ): Promise<void> {
    const serviceEntities = services.map((service) =>
      this.jobServicesRepository.create({
        job_id: job.id,
        service_name: service,
        status:
          service === 'sessions-service'
            ? ComplianceJobServiceStatus.IN_PROGRESS
            : ComplianceJobServiceStatus.PENDING,
      }),
    );

    if (serviceEntities.length) {
      await this.jobServicesRepository.save(serviceEntities);
    }
  }

  private async triggerInternalCoordinations(
    job: ComplianceJob,
  ): Promise<void> {
    if (!job.affected_services.includes('sessions-service')) {
      return;
    }

    await this.ensureSessionsRevoked(job);
  }

  private async ensureSessionsRevoked(job: ComplianceJob): Promise<void> {
    const sessionServiceRecord = await this.jobServicesRepository.findOne({
      where: {
        job_id: job.id,
        service_name: 'sessions-service',
      },
    });

    if (!sessionServiceRecord) {
      return;
    }

    if (sessionServiceRecord.status === ComplianceJobServiceStatus.COMPLETED) {
      return;
    }

    await this.sessionsService.revokeUserSessions(job.user_id, job.tenant_id);

    sessionServiceRecord.status = ComplianceJobServiceStatus.COMPLETED;
    sessionServiceRecord.completed_at = new Date();
    await this.jobServicesRepository.save(sessionServiceRecord);

    await this.refreshJobStatus(job.id);
  }

  private async refreshJobStatus(jobId: string): Promise<ComplianceJob> {
    const job = await this.jobsRepository.findOne({
      where: { id: jobId },
      relations: ['services'],
    });

    if (!job) {
      throw new NotFoundException(`Compliance job ${jobId} not found`);
    }

    if (!job.services?.length) {
      job.status = ComplianceJobStatus.COMPLETED;
      job.completed_at = job.completed_at ?? new Date();
      return this.jobsRepository.save(job);
    }

    const statuses = job.services.map((service) => service.status);

    if (
      statuses.every(
        (status) => status === ComplianceJobServiceStatus.COMPLETED,
      )
    ) {
      job.status = ComplianceJobStatus.COMPLETED;
      job.completed_at = job.completed_at ?? new Date();
    } else if (
      statuses.some((status) => status === ComplianceJobServiceStatus.FAILED)
    ) {
      job.status = ComplianceJobStatus.FAILED;
      job.completed_at = job.completed_at ?? new Date();
    } else {
      job.status = ComplianceJobStatus.IN_PROGRESS;
    }

    const savedJob = await this.jobsRepository.save(job);

    if (
      savedJob.status === ComplianceJobStatus.COMPLETED &&
      savedJob.result_callback_url &&
      savedJob.last_notification_status !== ComplianceJobStatus.COMPLETED
    ) {
      await this.sendCompletionWebhook(savedJob);
    }

    return savedJob;
  }

  private async sendCompletionWebhook(job: ComplianceJob): Promise<void> {
    try {
      if (!globalThis.fetch) {
        this.logger.warn(
          'Fetch API not available, skipping webhook notification',
        );
        return;
      }

      await globalThis.fetch(job.result_callback_url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: job.id,
          status: job.status,
          type: job.type,
          completed_at: job.completed_at?.toISOString(),
          affected_services: job.affected_services,
        }),
      });

      job.last_notified_at = new Date();
      job.last_notification_status = job.status;
      await this.jobsRepository.save(job);
    } catch (error) {
      this.logger.error('Failed to send completion webhook', error as Error);
    }
  }

  private normaliseServices(services: string[]): string[] {
    return Array.from(
      new Set((services ?? []).map((service) => service.trim())),
    ).filter(Boolean);
  }

  private buildStatusCallbackUrl(jobId: string): string {
    return `${this.statusCallbackBaseUrl}/${jobId}/callbacks`;
  }

  private isTerminal(status: ComplianceJobServiceStatus): boolean {
    return (
      status === ComplianceJobServiceStatus.COMPLETED ||
      status === ComplianceJobServiceStatus.FAILED
    );
  }
}
