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
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const session_entity_1 = require("./entities/session.entity");
const revocation_event_entity_1 = require("./entities/revocation-event.entity");
let SessionsService = class SessionsService {
    sessionsRepository;
    revocationEventsRepository;
    constructor(sessionsRepository, revocationEventsRepository) {
        this.sessionsRepository = sessionsRepository;
        this.revocationEventsRepository = revocationEventsRepository;
    }
    async revokeUserSessions(userId, tenantId) {
        await this.sessionsRepository.update({
            user: { id: userId },
            tenant_id: tenantId,
            revoked_at: (0, typeorm_2.IsNull)(),
        }, { revoked_at: new Date() });
        const revocationEvent = this.revocationEventsRepository.create({
            type: 'USER_LOGOUT',
            subject: userId,
            tenant_id: tenantId,
            not_before: new Date(),
        });
        await this.revocationEventsRepository.save(revocationEvent);
    }
    async revokeSession(sessionId) {
        await this.sessionsRepository.update({ id: sessionId }, { revoked_at: new Date() });
    }
    async getNotBeforeTime(userId, tenantId) {
        const lastLogoutEvent = await this.revocationEventsRepository.findOne({
            where: { subject: userId, tenant_id: tenantId, type: 'USER_LOGOUT' },
            order: { created_at: 'DESC' },
        });
        return lastLogoutEvent ? lastLogoutEvent.not_before : null;
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(1, (0, typeorm_1.InjectRepository)(revocation_event_entity_1.RevocationEvent)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SessionsService);
//# sourceMappingURL=sessions.service.js.map