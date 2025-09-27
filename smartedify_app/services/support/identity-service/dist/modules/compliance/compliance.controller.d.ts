import { ComplianceService } from './compliance.service';
export declare class ComplianceController {
    private readonly complianceService;
    constructor(complianceService: ComplianceService);
    exportData(userId: string): Promise<{
        jobId: string;
    }>;
    deleteData(userId: string): Promise<{
        jobId: string;
    }>;
}
