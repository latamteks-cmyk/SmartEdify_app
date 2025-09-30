import { Repository } from 'typeorm';
import { ComplianceJob } from './entities/compliance-job.entity';
import { ComplianceJobService } from './entities/compliance-job-service.entity';
import { RequestComplianceJobDto } from './dto/request-compliance-job.dto';
import { ComplianceJobCallbackDto } from './dto/compliance-job-callback.dto';
import { ComplianceEventsProducer } from './services/compliance-events.producer';
import { SessionsService } from '../sessions/sessions.service';
export declare class ComplianceService {
    private readonly jobsRepository;
    private readonly jobServicesRepository;
    private readonly sessionsService;
    private readonly eventsProducer;
    private readonly logger;
    private readonly statusCallbackBaseUrl;
    constructor(jobsRepository: Repository<ComplianceJob>, jobServicesRepository: Repository<ComplianceJobService>, sessionsService: SessionsService, eventsProducer: ComplianceEventsProducer);
    exportData(dto: RequestComplianceJobDto): Promise<ComplianceJob>;
    deleteData(dto: RequestComplianceJobDto): Promise<ComplianceJob>;
    handleJobCallback(jobId: string, callback: ComplianceJobCallbackDto): Promise<ComplianceJob>;
    private createJob;
    private publishEvent;
    private registerServices;
    private triggerInternalCoordinations;
    private ensureSessionsRevoked;
    private refreshJobStatus;
    private sendCompletionWebhook;
    private normaliseServices;
    private buildStatusCallbackUrl;
    private isTerminal;
}
