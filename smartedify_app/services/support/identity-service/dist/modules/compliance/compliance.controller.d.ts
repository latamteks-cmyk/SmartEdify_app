import { ComplianceService } from './compliance.service';
import { RequestComplianceJobDto } from './dto/request-compliance-job.dto';
import { ComplianceJobCallbackDto } from './dto/compliance-job-callback.dto';
export declare class ComplianceController {
    private readonly complianceService;
    constructor(complianceService: ComplianceService);
    exportData(payload: RequestComplianceJobDto): Promise<{
        job_id: string;
        status: import("./types/compliance-job.enums").ComplianceJobStatus;
    }>;
    deleteData(payload: RequestComplianceJobDto): Promise<{
        job_id: string;
        status: import("./types/compliance-job.enums").ComplianceJobStatus;
    }>;
    receiveCallback(jobId: string, callback: ComplianceJobCallbackDto): Promise<{
        job_id: string;
        status: import("./types/compliance-job.enums").ComplianceJobStatus;
    }>;
    reportIncident(incident: any): void;
}
