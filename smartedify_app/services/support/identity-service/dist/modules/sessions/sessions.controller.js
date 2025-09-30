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
exports.SessionsController = void 0;
const common_1 = require("@nestjs/common");
const sessions_service_1 = require("./sessions.service");
let SessionsController = class SessionsController {
    sessionsService;
    constructor(sessionsService) {
        this.sessionsService = sessionsService;
    }
    async getActiveSessions() {
        throw new common_1.NotImplementedException('Get active sessions not implemented.');
    }
    async revokeSession(sessionId) {
        await this.sessionsService.revokeSession(sessionId);
        return { message: `Session ${sessionId} has been revoked.` };
    }
    async revokeSubject(userId, tenantId) {
        if (!tenantId) {
            tenantId = 'mock-tenant-id';
        }
        await this.sessionsService.revokeUserSessions(userId, tenantId);
        return { message: `All sessions for subject ${userId} have been revoked.` };
    }
};
exports.SessionsController = SessionsController;
__decorate([
    (0, common_1.Get)('sessions/active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "getActiveSessions", null);
__decorate([
    (0, common_1.Post)('sessions/:id/revoke'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "revokeSession", null);
__decorate([
    (0, common_1.Post)('subject/revoke'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('user_id')),
    __param(1, (0, common_1.Body)('tenant_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "revokeSubject", null);
exports.SessionsController = SessionsController = __decorate([
    (0, common_1.Controller)('identity/v2'),
    __metadata("design:paramtypes", [sessions_service_1.SessionsService])
], SessionsController);
//# sourceMappingURL=sessions.controller.js.map