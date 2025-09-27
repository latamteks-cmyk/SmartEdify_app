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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaService = void 0;
const common_1 = require("@nestjs/common");
const otplib_1 = require("otplib");
const users_service_1 = require("../users/users.service");
let MfaService = class MfaService {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async generateSecret(userId) {
        const secret = otplib_1.authenticator.generateSecret();
        console.log(`MFA Secret for user ${userId}: ${secret}`);
        return secret;
    }
    async generateOtpAuthUrl(userId, email, secret) {
        return otplib_1.authenticator.keyuri(email, 'SmartEdify', secret);
    }
    async verify(userId, code) {
        const user = await this.usersService.findById(userId);
        if (!user || !user.mfa_secret) {
            return false;
        }
        return otplib_1.authenticator.verify({ token: code, secret: user.mfa_secret });
    }
};
exports.MfaService = MfaService;
exports.MfaService = MfaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], MfaService);
//# sourceMappingURL=mfa.service.js.map