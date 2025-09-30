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
import { SessionsService } from '../sessions/sessions.service';

// Define interfaces for mock objects to ensure type safety in tests
interface MockComplianceJob extends ComplianceJob {
  id: string;
  created_at: Date;
  updated_at: Date;
  services: MockComplianceJobService[];
}

interface MockComplianceJobService extends ComplianceJobService {
  id: string;
  job_id: string;
  created_at: Date;
  updated_at: Date;
}

describe('ComplianceService', () => {
  let service: ComplianceService;
  let jobsRepository: jest.Mocked<Repository<ComplianceJob>>;
  let jobServicesRepository: jest.Mocked<Repository<ComplianceJobService>>;
  let sessionsService: jest.Mocked<SessionsService>;
  let eventsProducer: jest.Mocked<ComplianceEventsProducer>;

  const createdAt = new Date('2025-01-01T00:00:00.000Z');
  let jobStore: MockComplianceJob | null;
  let jobServicesStore: MockComplianceJobService[];

  beforeEach(() => {
    jobStore = null;
    jobServicesStore = [];

    jobsRepository = {
      create: jest.fn(
        (entity: Partial<ComplianceJob>): Partial<ComplianceJob> => entity,
      ),
      save: jest
        .fn()
        .mockImplementation(
          async (
            entity: Partial<ComplianceJob>,
          ): Promise<MockComplianceJob> => {
            if (Array.isArray(entity)) {
              throw new Error('Unexpected array save');
            }

            const newJob: Partial<MockComplianceJob> = {
              id: 'job-1',
              created_at: createdAt,
              ...entity,
              updated_at: entity.updated_at ?? createdAt,
            };

            jobStore = {
              ...(jobStore ?? ({} as MockComplianceJob)),
              ...newJob,
              services:
                newJob.services ??
                jobServicesStore.filter((svc) => svc.job_id === newJob.id),
            } as MockComplianceJob;
            return jobStore;
          },
        ),
      findOne: jest
        .fn()
        .mockImplementation(
          async (options: {
            where: { id: string };
          }): Promise<MockComplianceJob | null> => {
            const { id } = options.where;
            if (!jobStore || jobStore.id !== id) {
              return null;
            }

            return {
              ...jobStore,
              services: jobServicesStore
                .filter((service) => service.job_id === id)
                .map((service) => ({ ...service })),
            } as MockComplianceJob;
          },
        ),
    } as unknown as jest.Mocked<Repository<ComplianceJob>>;

    jobServicesRepository = {
      create: jest.fn(
        (
          entity: Partial<ComplianceJobService>,
        ): Partial<ComplianceJobService> => entity,
      ),
      save: jest
        .fn()
        .mockImplementation(
          async (
            entity:
              | Partial<ComplianceJobService>
              | Partial<ComplianceJobService>[],
          ): Promise<
            Partial<ComplianceJobService> | Partial<ComplianceJobService>[]
          > => {
            const entities = Array.isArray(entity) ? entity : [entity];
            entities.forEach((item) => {
              const storedItem: MockComplianceJobService = {
                id: item.id ?? `service-${jobServicesStore.length + 1}`,
                job_id: item.job_id as string,
                job: item.job as ComplianceJob,
                service_name: item.service_name as string,
                status: item.status ?? ComplianceJobServiceStatus.PENDING,
                created_at: item.created_at ?? createdAt,
                updated_at: createdAt,
                completed_at: item.completed_at,
                error_message: item.error_message,
                metadata: item.metadata,
              };

              jobServicesStore = jobServicesStore.filter(
                (existing) =>
                  !(
                    existing.job_id === storedItem.job_id &&
                    existing.service_name === storedItem.service_name
                  ),
              );
              jobServicesStore.push(storedItem);
            });

            return entity;
          },
        ),
      findOne: jest
        .fn()
        .mockImplementation(
          async (options: {
            where: { job_id: string; service_name: string };
          }): Promise<MockComplianceJobService | null> => {
            const { job_id, service_name } = options.where;
            return (
              jobServicesStore.find(
                (s) => s.job_id === job_id && s.service_name === service_name,
              ) ?? null
            );
          },
        ),
    } as unknown as jest.Mocked<Repository<ComplianceJobService>>;

    sessionsService = {
      revokeUserSessions: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SessionsService>;

    eventsProducer = {
      emitDataExportRequested: jest.fn().mockResolvedValue(undefined),
      emitDataDeletionRequested: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ComplianceEventsProducer>;

    service = new ComplianceService(
      jobsRepository,
      jobServicesRepository,
      sessionsService,
      eventsProducer,
    );

    if (!(globalThis as any).fetch) {
      (globalThis as any).fetch = jest.fn();
    }

    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const baseRequest: RequestComplianceJobDto = {
    user_id: 'user-1',
    tenant_id: 'tenant-1',
    type: ComplianceJobType.DATA_DELETION,
    affected_services: [],
    status_callback_url: 'http://localhost/callback',
  };

  it('creates a deletion job, persists records, coordinates sessions and publishes events', async () => {
    const request: RequestComplianceJobDto = {
      ...baseRequest,
      affected_services: ['governance-service', 'sessions-service'],
    };

    const job = await service.deleteData(request);

    expect(job.id).toBe('job-1');
    expect(job.status).toBe(ComplianceJobStatus.IN_PROGRESS);
    expect(job.affected_services).toEqual([
      'governance-service',
      'sessions-service',
    ]);

    expect(eventsProducer.emitDataDeletionRequested).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: 'job-1',
        user_id: request.user_id,
        tenant_id: request.tenant_id,
        type: ComplianceJobType.DATA_DELETION,
        affected_services: ['governance-service', 'sessions-service'],
        status_callback_url: expect.stringContaining(
          '/privacy/jobs/job-1/callbacks',
        ),
      }),
    );

    expect(sessionsService.revokeUserSessions).toHaveBeenCalledWith(
      request.user_id,
      request.tenant_id,
    );

    const sessionServiceRecord = jobServicesStore.find(
      (serviceRecord) => serviceRecord.service_name === 'sessions-service',
    );
    expect(sessionServiceRecord?.status).toBe(
      ComplianceJobServiceStatus.COMPLETED,
    );

    const governanceRecord = jobServicesStore.find(
      (serviceRecord) => serviceRecord.service_name === 'governance-service',
    );
    expect(governanceRecord?.status).toBe(ComplianceJobServiceStatus.PENDING);
  });

  it('handles callbacks idempotently', async () => {
    const request: RequestComplianceJobDto = {
      ...baseRequest,
      type: ComplianceJobType.DATA_EXPORT,
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
    expect(jobServicesRepository.save).toHaveBeenCalledTimes(
      initialSaveCalls + 1,
    );

    const afterFirst = jobServicesRepository.save.mock.calls.length;

    const secondCallback = await service.handleJobCallback('job-1', {
      service_name: 'governance-service',
      status: ComplianceJobServiceStatus.COMPLETED,
    });

    expect(secondCallback.status).toBe(ComplianceJobStatus.COMPLETED);
    expect(jobServicesRepository.save).toHaveBeenCalledTimes(afterFirst);
  });
});
