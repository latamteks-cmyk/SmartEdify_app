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
    async registrationOptions(username, userId) {
        return this.webauthnService.generateRegistrationOptions(username, userId);
    }
    async registrationVerification(body) {
        const expectedChallenge = 'mock_challenge';
        return this.webauthnService.verifyRegistration(body, expectedChallenge);
    }
    async authenticationOptions() {
        return this.webauthnService.generateAuthenticationOptions();
    }
    async authenticationVerification(body) {
        const expectedChallenge = 'mock_challenge';
        const authenticator = {};
        return this.webauthnService.verifyAuthentication(body, expectedChallenge, authenticator);
    }
};
exports.WebauthnController = WebauthnController;
__decorate([
    (0, common_1.Get)('registration/options'),
    __param(0, (0, common_1.Query)('username')),
    __param(1, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WebauthnController.prototype, "registrationOptions", null);
__decorate([
    (0, common_1.Post)('registration/verification'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebauthnController.prototype, "registrationVerification", null);
__decorate([
    (0, common_1.Get)('authentication/options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WebauthnController.prototype, "authenticationOptions", null);
__decorate([
    (0, common_1.Post)('authentication/verification'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebauthnController.prototype, "authenticationVerification", null);
exports.WebauthnController = WebauthnController = __decorate([
    (0, common_1.Controller)('webauthn'),
    __metadata("design:paramtypes", [webauthn_service_1.WebauthnService])
], WebauthnController);
//# sourceMappingURL=webauthn.controller.js.map