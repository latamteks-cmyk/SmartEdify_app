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
let ComplianceController = class ComplianceController {
    complianceService;
    constructor(complianceService) {
        this.complianceService = complianceService;
    }
    async exportData(userId) {
        const jobId = await this.complianceService.exportData(userId);
        return { jobId };
    }
    async deleteData(userId) {
        const jobId = await this.complianceService.deleteData(userId);
        return { jobId };
    }
};
exports.ComplianceController = ComplianceController;
__decorate([
    (0, common_1.Post)('export'),
    (0, common_1.UseGuards)(mfa_guard_1.MfaGuard),
    __param(0, (0, common_1.Body)('user_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ComplianceController.prototype, "exportData", null);
__decorate([
    (0, common_1.Delete)('data'),
    (0, common_1.UseGuards)(mfa_guard_1.MfaGuard),
    __param(0, (0, common_1.Body)('user_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ComplianceController.prototype, "deleteData", null);
exports.ComplianceController = ComplianceController = __decorate([
    (0, common_1.Controller)('privacy'),
    __metadata("design:paramtypes", [compliance_service_1.ComplianceService])
], ComplianceController);
//# sourceMappingURL=compliance.controller.js.map