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
exports.JwksController = void 0;
const common_1 = require("@nestjs/common");
const key_management_service_1 = require("../services/key-management.service");
let JwksController = class JwksController {
    keyManagementService;
    constructor(keyManagementService) {
        this.keyManagementService = keyManagementService;
    }
    async getJwksForTenant(tenantId) {
        if (!tenantId) {
            throw new common_1.BadRequestException('tenant_id is a required query parameter.');
        }
        return this.keyManagementService.getJwksForTenant(tenantId);
    }
};
exports.JwksController = JwksController;
__decorate([
    (0, common_1.Get)('.well-known/jwks.json'),
    __param(0, (0, common_1.Query)('tenant_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JwksController.prototype, "getJwksForTenant", null);
exports.JwksController = JwksController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [key_management_service_1.KeyManagementService])
], JwksController);
//# sourceMappingURL=jwks.controller.js.map