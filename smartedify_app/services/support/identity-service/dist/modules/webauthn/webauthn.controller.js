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
exports.WebauthnController = void 0;
const common_1 = require("@nestjs/common");
const webauthn_service_1 = require("./webauthn.service");
let WebauthnController = class WebauthnController {
    webauthnService;
    constructor(webauthnService) {
        this.webauthnService = webauthnService;
    }
    async registrationOptions(username) {
        return this.webauthnService.generateRegistrationOptions(username);
    }
    async registrationVerification(body, userId, challenge) {
        if (!challenge) {
            throw new common_1.BadRequestException('webauthn-challenge header is required');
        }
        return this.webauthnService.verifyRegistration(body, userId, challenge);
    }
    async authenticationOptions(username) {
        return this.webauthnService.generateAuthenticationOptions(username);
    }
    async authenticationVerification(body, challenge) {
        if (!challenge) {
            throw new common_1.BadRequestException('webauthn-challenge header is required');
        }
        return this.webauthnService.verifyAuthentication(body, challenge);
    }
};
exports.WebauthnController = WebauthnController;
__decorate([
    (0, common_1.Post)('attestation/options'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebauthnController.prototype, "registrationOptions", null);
__decorate([
    (0, common_1.Post)('attestation/result'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Body)('userId')),
    __param(2, (0, common_1.Headers)('webauthn-challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], WebauthnController.prototype, "registrationVerification", null);
__decorate([
    (0, common_1.Post)('assertion/options'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebauthnController.prototype, "authenticationOptions", null);
__decorate([
    (0, common_1.Post)('assertion/result'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('webauthn-challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WebauthnController.prototype, "authenticationVerification", null);
exports.WebauthnController = WebauthnController = __decorate([
    (0, common_1.Controller)('webauthn'),
    __metadata("design:paramtypes", [webauthn_service_1.WebauthnService])
], WebauthnController);
//# sourceMappingURL=webauthn.controller.js.map