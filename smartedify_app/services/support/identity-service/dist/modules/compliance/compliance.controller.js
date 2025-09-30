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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceController = void 0;
const common_1 = require("@nestjs/common");
const compliance_service_1 = require("./compliance.service");
const mfa_guard_1 = require("../mfa/guards/mfa.guard");
const request_compliance_job_dto_1 = require("./dto/request-compliance-job.dto");
const compliance_job_callback_dto_1 = require("./dto/compliance-job-callback.dto");
let ComplianceController = class ComplianceController {
    complianceService;
    constructor(complianceService) {
        this.complianceService = complianceService;
    }
    async exportData(payload) {
        const job = await this.complianceService.exportData(payload);
        return { job_id: job.id, status: job.status };
    }
    async deleteData(payload) {
        const job = await this.complianceService.deleteData(payload);
        return { job_id: job.id, status: job.status };
    }
    async receiveCallback(jobId, callback) {
        const job = await this.complianceService.handleJobCallback(jobId, callback);
        return { job_id: job.id, status: job.status };
    }
    reportIncident(_incident) {
        throw new common_1.NotImplementedException('Incident reporting not implemented.');
    }
};
exports.ComplianceController = ComplianceController;
__decorate([
    (0, common_1.Post)('privacy/export'),
    (0, common_1.UseGuards)(mfa_guard_1.MfaGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_compliance_job_dto_1.RequestComplianceJobDto]),
    __metadata("design:returntype", Promise)
], ComplianceController.prototype, "exportData", null);
__decorate([
    (0, common_1.Delete)('privacy/data'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, common_1.UseGuards)(mfa_guard_1.MfaGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_compliance_job_dto_1.RequestComplianceJobDto]),
    __metadata("design:returntype", Promise)
], ComplianceController.prototype, "deleteData", null);
__decorate([
    (0, common_1.Post)('jobs/:jobId/callbacks'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, compliance_job_callback_dto_1.ComplianceJobCallbackDto]),
    __metadata("design:returntype", Promise)
], ComplianceController.prototype, "receiveCallback", null);
__decorate([
    (0, common_1.Post)('compliance/incidents'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ComplianceController.prototype, "reportIncident", null);
exports.ComplianceController = ComplianceController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [compliance_service_1.ComplianceService])
], ComplianceController);
//# sourceMappingURL=compliance.controller.js.map