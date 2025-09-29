import { ComplianceService } from './compliance.service';
import { Repository } from 'typeorm';
import { ComplianceJob } from './entities/compliance-job.entity';
import { ComplianceJobService } from './entities/compliance-job-service.entity';
import {
  ComplianceJobServiceStatus,
  ComplianceJobStatus,
  ComplianceJobType,
} from './types/compliance-job.enums';
import { RequestComplianceJobDto } from './dto/request-compliance-job.dto';
import { ComplianceEventsProducer } from './services/compliance-events.producer';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let jobsRepository: jest.Mocked<Repository<ComplianceJob>>;
  let jobServicesRepository: jest.Mocked<Repository<ComplianceJobService>>;
  let sessionsService: { revokeUserSessions: jest.Mock };
  let eventsProducer: {
    emitDataExportRequested: jest.Mock;
    emitDataDeletionRequested: jest.Mock;
  };

  const createdAt = new Date('2025-01-01T00:00:00.000Z');
  let jobStore: ComplianceJob | null;
  let jobServicesStore: ComplianceJobService[];

  beforeEach(() => {
    jobStore = null;
    jobServicesStore = [];

    jobsRepository = {
      create: jest.fn((entity: Partial<ComplianceJob>) => ({
        ...entity,
      })) as any,
      save: jest.fn(async (entity: any) => {
        if (Array.isArray(entity)) {
          throw new Error('Unexpected array save');
        }

        if (!entity.id) {
          entity.id = 'job-1';
          entity.created_at = createdAt;
        }

        entity.updated_at = entity.updated_at ?? createdAt;
        jobStore = {
          ...(jobStore ?? ({} as ComplianceJob)),
          ...entity,
          services: entity.services ?? jobServicesStore.filter((svc) => svc.job_id === entity.id),
        } as ComplianceJob;
        return jobStore;
      }) as any,
      findOne: jest.fn(async ({ where: { id } }: any) => {
        if (!jobStore || jobStore.id !== id) {
          return null;
        }

        return {
          ...jobStore,
          services: jobServicesStore
            .filter((service) => service.job_id === id)
            .map((service) => ({ ...service })),
        } as ComplianceJob;
      }) as any,
    } as jest.Mocked<Repository<ComplianceJob>>;

    jobServicesRepository = {
      create: jest.fn((entity: Partial<ComplianceJobService>) => ({
        ...entity,
      })) as any,
      save: jest.fn(async (entity: any) => {
        const entities = Array.isArray(entity) ? entity : [entity];
        entities.forEach((item) => {
          const storedItem: ComplianceJobService = {
            id: item.id ?? `service-${jobServicesStore.length + 1}`,
            job_id: item.job_id,
            job: item.job,
            service_name: item.service_name,
            status: item.status ?? ComplianceJobServiceStatus.PENDING,
            created_at: item.created_at ?? createdAt,
            updated_at: createdAt,
            completed_at: item.completed_at,
            error_message: item.error_message,
            metadata: item.metadata,
          } as ComplianceJobService;

          jobServicesStore = jobServicesStore.filter(
            (existing) => !(existing.job_id === storedItem.job_id && existing.service_name === storedItem.service_name),
          );
          jobServicesStore.push(storedItem);
        });

        return entity;
      }) as any,
      findOne: jest.fn(async ({ where: { job_id, service_name } }: any) =>
        jobServicesStore.find(
          (service) => service.job_id === job_id && service.service_name === service_name,
        ) ?? null,
      ) as any,
    } as jest.Mocked<Repository<ComplianceJobService>>;

    sessionsService = {
      revokeUserSessions: jest.fn().mockResolvedValue(undefined),
    };

    eventsProducer = {
      emitDataExportRequested: jest.fn().mockResolvedValue(undefined),
      emitDataDeletionRequested: jest.fn().mockResolvedValue(undefined),
    };

    service = new ComplianceService(
      jobsRepository,
      jobServicesRepository,
      sessionsService as any,
      eventsProducer as unknown as ComplianceEventsProducer,
    );

    if (!(globalThis as any).fetch) {
      (globalThis as any).fetch = jest.fn();
    }

    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const baseRequest: RequestComplianceJobDto = {
    user_id: 'user-1',
    tenant_id: 'tenant-1',
  } as RequestComplianceJobDto;

  it('creates a deletion job, persists records, coordinates sessions and publishes events', async () => {
    const request: RequestComplianceJobDto = {
      ...baseRequest,
      affected_services: ['governance-service', 'sessions-service'],
    };

    const job = await service.deleteData(request);

    expect(job.id).toBe('job-1');
    expect(job.status).toBe(ComplianceJobStatus.IN_PROGRESS);
    expect(job.affected_services).toEqual(['governance-service', 'sessions-service']);

    expect(eventsProducer.emitDataDeletionRequested).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: 'job-1',
        user_id: request.user_id,
        tenant_id: request.tenant_id,
        type: ComplianceJobType.DATA_DELETION,
        affected_services: ['governance-service', 'sessions-service'],
        status_callback_url: expect.stringContaining('/privacy/jobs/job-1/callbacks'),
      }),
    );

    expect(sessionsService.revokeUserSessions).toHaveBeenCalledWith(
      request.user_id,
      request.tenant_id,
    );

    const sessionServiceRecord = jobServicesStore.find(
      (serviceRecord) => serviceRecord.service_name === 'sessions-service',
    );
    expect(sessionServiceRecord?.status).toBe(ComplianceJobServiceStatus.COMPLETED);

    const governanceRecord = jobServicesStore.find(
      (serviceRecord) => serviceRecord.service_name === 'governance-service',
    );
    expect(governanceRecord?.status).toBe(ComplianceJobServiceStatus.PENDING);
  });

  it('handles callbacks idempotently', async () => {
    const request: RequestComplianceJobDto = {
      ...baseRequest,
      affected_services: ['governance-service'],
    };

    const job = await service.exportData(request);

    expect(job.status).toBe(ComplianceJobStatus.IN_PROGRESS);

    const initialSaveCalls = jobServicesRepository.save.mock.calls.length;

    const firstCallback = await service.handleJobCallback('job-1', {
      service_name: 'governance-service',
      status: ComplianceJobServiceStatus.COMPLETED,
    });

    expect(firstCallback.status).toBe(ComplianceJobStatus.COMPLETED);
    expect(jobServicesRepository.save).toHaveBeenCalledTimes(initialSaveCalls + 1);

    const afterFirst = jobServicesRepository.save.mock.calls.length;

    const secondCallback = await service.handleJobCallback('job-1', {
      service_name: 'governance-service',
      status: ComplianceJobServiceStatus.COMPLETED,
    });

    expect(secondCallback.status).toBe(ComplianceJobStatus.COMPLETED);
    expect(jobServicesRepository.save).toHaveBeenCalledTimes(afterFirst);
  });
});
