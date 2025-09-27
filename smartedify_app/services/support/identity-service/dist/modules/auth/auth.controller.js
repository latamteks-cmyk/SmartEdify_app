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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const client_auth_guard_1 = require("./guards/client-auth.guard");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async authorize(code_challenge, code_challenge_method) {
        if (!code_challenge || !code_challenge_method) {
            throw new common_1.BadRequestException('PKCE parameters are required');
        }
        const code = await this.authService.generateAuthorizationCode(code_challenge, code_challenge_method);
        return { code };
    }
    async token(grant_type, code, code_verifier, dpopProof, req) {
        if (grant_type !== 'authorization_code') {
            throw new common_1.BadRequestException('Invalid grant_type');
        }
        if (!code || !code_verifier) {
            throw new common_1.BadRequestException('Code and code_verifier are required');
        }
        const httpMethod = req.method;
        const httpUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        const [access_token, refresh_token] = await Promise.all([
            this.authService.generateAccessToken(code, code_verifier, dpopProof, httpMethod, httpUrl),
            this.authService.generateRefreshToken(code, code_verifier),
        ]);
        return { access_token, refresh_token };
    }
    async introspect(token) {
        return this.authService.introspect(token);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('authorize'),
    __param(0, (0, common_1.Query)('code_challenge')),
    __param(1, (0, common_1.Query)('code_challenge_method')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "authorize", null);
__decorate([
    (0, common_1.Post)('token'),
    __param(0, (0, common_1.Body)('grant_type')),
    __param(1, (0, common_1.Body)('code')),
    __param(2, (0, common_1.Body)('code_verifier')),
    __param(3, (0, common_1.Headers)('DPoP')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "token", null);
__decorate([
    (0, common_1.Post)('introspect'),
    (0, common_1.UseGuards)(client_auth_guard_1.ClientAuthGuard),
    __param(0, (0, common_1.Body)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "introspect", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('oauth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map