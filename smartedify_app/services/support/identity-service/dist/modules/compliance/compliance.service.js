"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ComplianceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const compliance_job_entity_1 = require("./entities/compliance-job.entity");
const compliance_job_service_entity_1 = require("./entities/compliance-job-service.entity");
const compliance_job_enums_1 = require("./types/compliance-job.enums");
const compliance_events_producer_1 = require("./services/compliance-events.producer");
const sessions_service_1 = require("../sessions/sessions.service");
let ComplianceService = ComplianceService_1 = class ComplianceService {
    jobsRepository;
    jobServicesRepository;
    sessionsService;
    eventsProducer;
    logger = new common_1.Logger(ComplianceService_1.name);
    statusCallbackBaseUrl;
    constructor(jobsRepository, jobServicesRepository, sessionsService, eventsProducer) {
        this.jobsRepository = jobsRepository;
        this.jobServicesRepository = jobServicesRepository;
        this.sessionsService = sessionsService;
        this.eventsProducer = eventsProducer;
        this.statusCallbackBaseUrl = (process.env.COMPLIANCE_JOB_CALLBACK_BASE_URL ||
            'http://identity-service:3001/privacy/jobs').replace(/\/$/, '');
    }
    async exportData(dto) {
        const services = this.normaliseServices(dto.affected_services ?? ['governance-service']);
        return this.createJob(compliance_job_enums_1.ComplianceJobType.DATA_EXPORT, dto, services);
    }
    async deleteData(dto) {
        const services = this.normaliseServices(dto.affected_services ?? ['governance-service', 'sessions-service']);
        return this.createJob(compliance_job_enums_1.ComplianceJobType.DATA_DELETION, dto, services);
    }
    async handleJobCallback(jobId, callback) {
        const job = await this.jobsRepository.findOne({
            where: { id: jobId },
            relations: ['services'],
        });
        if (!job) {
            throw new common_1.NotFoundException(`Compliance job ${jobId} not found`);
        }
        const serviceRecord = job.services?.find((service) => service.service_name === callback.service_name);
        if (!serviceRecord) {
            throw new common_1.BadRequestException(`Service ${callback.service_name} is not registered for job ${jobId}`);
        }
        if (this.isTerminal(serviceRecord.status)) {
            this.logger.debug(`Ignoring callback for job ${jobId} service ${serviceRecord.service_name} because it is already ${serviceRecord.status}`);
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
        if (callback.service_name === 'sessions-service' &&
            callback.status === compliance_job_enums_1.ComplianceJobServiceStatus.COMPLETED) {
            await this.ensureSessionsRevoked(refreshedJob);
        }
        return refreshedJob;
    }
    async createJob(type, dto, services) {
        if (!services.length) {
            throw new common_1.BadRequestException('At least one affected service is required');
        }
        const jobEntity = this.jobsRepository.create({
            user_id: dto.user_id,
            tenant_id: dto.tenant_id,
            type,
            status: compliance_job_enums_1.ComplianceJobStatus.PENDING,
            affected_services: services,
            status_callback_url: '',
            result_callback_url: dto.result_callback_url,
        });
        let persistedJob = await this.jobsRepository.save(jobEntity);
        persistedJob.status_callback_url = this.buildStatusCallbackUrl(persistedJob.id);
        persistedJob = await this.jobsRepository.save(persistedJob);
        await this.registerServices(persistedJob, services);
        await this.triggerInternalCoordinations(persistedJob);
        await this.publishEvent(type, persistedJob);
        return this.refreshJobStatus(persistedJob.id);
    }
    async publishEvent(type, job) {
        const payload = {
            job_id: job.id,
            user_id: job.user_id,
            tenant_id: job.tenant_id,
            type,
            requested_at: job.created_at.toISOString(),
            affected_services: job.affected_services,
            status_callback_url: job.status_callback_url,
            result_callback_url: job.result_callback_url,
        };
        if (type === compliance_job_enums_1.ComplianceJobType.DATA_EXPORT) {
            await this.eventsProducer.emitDataExportRequested(payload);
        }
        else {
            await this.eventsProducer.emitDataDeletionRequested(payload);
        }
    }
    async registerServices(job, services) {
        const serviceEntities = services.map((service) => this.jobServicesRepository.create({
            job_id: job.id,
            service_name: service,
            status: service === 'sessions-service'
                ? compliance_job_enums_1.ComplianceJobServiceStatus.IN_PROGRESS
                : compliance_job_enums_1.ComplianceJobServiceStatus.PENDING,
        }));
        if (serviceEntities.length) {
            await this.jobServicesRepository.save(serviceEntities);
        }
    }
    async triggerInternalCoordinations(job) {
        if (!job.affected_services.includes('sessions-service')) {
            return;
        }
        await this.ensureSessionsRevoked(job);
    }
    async ensureSessionsRevoked(job) {
        const sessionServiceRecord = await this.jobServicesRepository.findOne({
            where: {
                job_id: job.id,
                service_name: 'sessions-service',
            },
        });
        if (!sessionServiceRecord) {
            return;
        }
        if (sessionServiceRecord.status === compliance_job_enums_1.ComplianceJobServiceStatus.COMPLETED) {
            return;
        }
        await this.sessionsService.revokeUserSessions(job.user_id, job.tenant_id);
        sessionServiceRecord.status = compliance_job_enums_1.ComplianceJobServiceStatus.COMPLETED;
        sessionServiceRecord.completed_at = new Date();
        await this.jobServicesRepository.save(sessionServiceRecord);
        await this.refreshJobStatus(job.id);
    }
    async refreshJobStatus(jobId) {
        const job = await this.jobsRepository.findOne({
            where: { id: jobId },
            relations: ['services'],
        });
        if (!job) {
            throw new common_1.NotFoundException(`Compliance job ${jobId} not found`);
        }
        if (!job.services?.length) {
            job.status = compliance_job_enums_1.ComplianceJobStatus.COMPLETED;
            job.completed_at = job.completed_at ?? new Date();
            return this.jobsRepository.save(job);
        }
        const statuses = job.services.map((service) => service.status);
        if (statuses.every((status) => status === compliance_job_enums_1.ComplianceJobServiceStatus.COMPLETED)) {
            job.status = compliance_job_enums_1.ComplianceJobStatus.COMPLETED;
            job.completed_at = job.completed_at ?? new Date();
        }
        else if (statuses.some((status) => status === compliance_job_enums_1.ComplianceJobServiceStatus.FAILED)) {
            job.status = compliance_job_enums_1.ComplianceJobStatus.FAILED;
            job.completed_at = job.completed_at ?? new Date();
        }
        else {
            job.status = compliance_job_enums_1.ComplianceJobStatus.IN_PROGRESS;
        }
        const savedJob = await this.jobsRepository.save(job);
        if (savedJob.status === compliance_job_enums_1.ComplianceJobStatus.COMPLETED &&
            savedJob.result_callback_url &&
            savedJob.last_notification_status !== compliance_job_enums_1.ComplianceJobStatus.COMPLETED) {
            await this.sendCompletionWebhook(savedJob);
        }
        return savedJob;
    }
    async sendCompletionWebhook(job) {
        try {
            if (!globalThis.fetch) {
                this.logger.warn('Fetch API not available, skipping webhook notification');
                return;
            }
            await globalThis.fetch(job.result_callback_url, {
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
        }
        catch (error) {
            this.logger.error('Failed to send completion webhook', error);
        }
    }
    normaliseServices(services) {
        return Array.from(new Set((services ?? []).map((service) => service.trim()))).filter(Boolean);
    }
    buildStatusCallbackUrl(jobId) {
        return `${this.statusCallbackBaseUrl}/${jobId}/callbacks`;
    }
    isTerminal(status) {
        return (status === compliance_job_enums_1.ComplianceJobServiceStatus.COMPLETED ||
            status === compliance_job_enums_1.ComplianceJobServiceStatus.FAILED);
    }
};
exports.ComplianceService = ComplianceService;
exports.ComplianceService = ComplianceService = ComplianceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(compliance_job_entity_1.ComplianceJob)),
    __param(1, (0, typeorm_1.InjectRepository)(compliance_job_service_entity_1.ComplianceJobService)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        sessions_service_1.SessionsService,
        compliance_events_producer_1.ComplianceEventsProducer])
], ComplianceService);
//# sourceMappingURL=compliance.service.js.map