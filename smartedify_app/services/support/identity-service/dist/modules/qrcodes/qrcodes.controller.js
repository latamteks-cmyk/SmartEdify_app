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
exports.QrcodesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const qrcodes_service_1 = require("./qrcodes.service");
const dpop_guard_1 = require("../auth/guards/dpop.guard");
let QrcodesController = class QrcodesController {
    qrcodesService;
    constructor(qrcodesService) {
        this.qrcodesService = qrcodesService;
    }
    async generateContextualToken(request) {
        const payload = {
            iss: `https://auth.smartedify.global/t/${request.audience}`,
            aud: request.audience,
            sub: 'contextual-access',
            jti: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            nbf: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (request.expires_in || 300),
            event_id: request.event_id,
            location: request.location,
        };
        const qrCodeDataUrl = await this.qrcodesService.generateQrCode(payload);
        return {
            qr_code: qrCodeDataUrl,
            token: payload,
            expires_at: new Date(payload.exp * 1000).toISOString(),
        };
    }
    async validateContextualToken(request) {
        try {
            const payload = await this.qrcodesService.validateQrCode(request.token);
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                throw new Error('Token expired');
            }
            if (payload.nbf && payload.nbf > now) {
                throw new Error('Token not yet valid');
            }
            if (payload.aud !== request.audience) {
                throw new Error('Invalid audience');
            }
            return {
                valid: true,
                payload,
                message: 'Token is valid',
            };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Invalid token',
                message: 'Token validation failed',
            };
        }
    }
};
exports.QrcodesController = QrcodesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Generate contextual token (QR)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QrcodesController.prototype, "generateContextualToken", null);
__decorate([
    (0, common_1.Post)('/validate'),
    (0, swagger_1.ApiOperation)({ summary: 'Validate contextual token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QrcodesController.prototype, "validateContextualToken", null);
exports.QrcodesController = QrcodesController = __decorate([
    (0, swagger_1.ApiTags)('Contextual Tokens'),
    (0, common_1.Controller)('/identity/v2/contextual-tokens'),
    (0, common_1.UseGuards)(dpop_guard_1.DpopGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [qrcodes_service_1.QrcodesService])
], QrcodesController);
//# sourceMappingURL=qrcodes.controller.js.map