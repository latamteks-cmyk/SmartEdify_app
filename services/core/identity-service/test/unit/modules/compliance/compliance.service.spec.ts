import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ComplianceService } from '../../../../src/modules/compliance/compliance.service';
import { Repository } from 'typeorm';
import { ComplianceJob } from '../../../../src/modules/compliance/entities/compliance-job.entity';
import { ComplianceJobService } from '../../../../src/modules/compliance/entities/compliance-job-service.entity';
import { SessionsService } from '../../../../src/modules/sessions/sessions.service';
import { ComplianceEventsProducer } from '../../../../src/modules/compliance/services/compliance-events.producer';

describe('ComplianceService', () => {
  let service: ComplianceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        {
          provide: getRepositoryToken(ComplianceJob),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ComplianceJobService),
          useClass: Repository,
        },
        {
          provide: SessionsService,
          useValue: {
            revokeUserSessions: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ComplianceEventsProducer,
          useValue: {
            emitDataDeletionRequested: jest.fn().mockResolvedValue(undefined),
            emitDataExportRequested: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should expose DSAR job creation methods', async () => {
    expect(service.exportData).toBeDefined();
    expect(service.deleteData).toBeDefined();
    expect(service.handleJobCallback).toBeDefined();
  });
});
