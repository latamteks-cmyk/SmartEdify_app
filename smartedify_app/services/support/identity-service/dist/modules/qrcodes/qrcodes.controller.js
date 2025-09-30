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
const qrcodes_service_1 = require("./qrcodes.service");
let QrcodesController = class QrcodesController {
    qrcodesService;
    constructor(qrcodesService) {
        this.qrcodesService = qrcodesService;
    }
    async generate(payload) {
        const qrCodeDataUrl = await this.qrcodesService.generateQrCode(payload);
        return { qrCodeDataUrl };
    }
    async validate(token) {
        const isValid = await this.qrcodesService.validateQrCode(token);
        return { isValid };
    }
};
exports.QrcodesController = QrcodesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QrcodesController.prototype, "generate", null);
__decorate([
    (0, common_1.Post)('validate'),
    __param(0, (0, common_1.Body)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QrcodesController.prototype, "validate", null);
exports.QrcodesController = QrcodesController = __decorate([
    (0, common_1.Controller)('identity/v2/contextual-tokens'),
    __metadata("design:paramtypes", [qrcodes_service_1.QrcodesService])
], QrcodesController);
//# sourceMappingURL=qrcodes.controller.js.map