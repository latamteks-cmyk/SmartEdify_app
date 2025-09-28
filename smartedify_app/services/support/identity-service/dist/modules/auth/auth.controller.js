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
    async pushedAuthorizationRequest(payload) {
        if (!payload.code_challenge || !payload.code_challenge_method) {
            throw new common_1.BadRequestException('PKCE parameters are required in PAR payload');
        }
        return this.authService.pushedAuthorizationRequest(payload);
    }
    async deviceAuthorization() {
        return this.authService.deviceAuthorizationRequest();
    }
    async authorize(res, redirect_uri, scope, request_uri, code_challenge, code_challenge_method) {
        if (!redirect_uri) {
            throw new common_1.BadRequestException('redirect_uri is required');
        }
        if (!scope) {
            throw new common_1.BadRequestException('scope is required');
        }
        const mockUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
        const code = await this.authService.generateAuthorizationCode({
            request_uri,
            code_challenge,
            code_challenge_method,
            userId: mockUserId,
            scope,
        });
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.append('code', code);
        res.redirect(redirectUrl.toString());
    }
    async token(grant_type, body, dpopProof, req) {
        const httpMethod = req.method;
        const httpUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        if (grant_type === 'authorization_code') {
            if (!body.code || !body.code_verifier) {
                throw new common_1.BadRequestException('Code and code_verifier are required');
            }
            const [access_token, refresh_token] = await this.authService.exchangeCodeForTokens(body.code, body.code_verifier, dpopProof, httpMethod, httpUrl);
            return { access_token, refresh_token, token_type: 'DPoP' };
        }
        else if (grant_type === 'refresh_token') {
            if (!body.refresh_token) {
                throw new common_1.BadRequestException('refresh_token is required');
            }
            if (!dpopProof) {
                throw new common_1.BadRequestException('DPoP proof is required for refresh token flow');
            }
            const [access_token, new_refresh_token] = await this.authService.refreshTokens(body.refresh_token, dpopProof, httpMethod, httpUrl);
            return { access_token, refresh_token: new_refresh_token, token_type: 'DPoP' };
        }
        else if (grant_type === 'urn:ietf:params:oauth:grant-type:device_code') {
            if (!body.device_code) {
                throw new common_1.BadRequestException('device_code is required');
            }
            throw new common_1.BadRequestException('device_code grant type not yet implemented');
        }
        else {
            throw new common_1.BadRequestException('Invalid grant_type');
        }
    }
    async revoke(token, token_type_hint) {
        if (!token) {
            throw new common_1.BadRequestException('token is required');
        }
        await this.authService.revokeToken(token, token_type_hint);
        return {};
    }
    async introspect(token) {
        return this.authService.introspect(token);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('par'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "pushedAuthorizationRequest", null);
__decorate([
    (0, common_1.Post)('device_authorization'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "deviceAuthorization", null);
__decorate([
    (0, common_1.Get)('authorize'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('redirect_uri')),
    __param(2, (0, common_1.Query)('scope')),
    __param(3, (0, common_1.Query)('request_uri')),
    __param(4, (0, common_1.Query)('code_challenge')),
    __param(5, (0, common_1.Query)('code_challenge_method')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "authorize", null);
__decorate([
    (0, common_1.Post)('token'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('grant_type')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('DPoP')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "token", null);
__decorate([
    (0, common_1.Post)('revoke'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('token')),
    __param(1, (0, common_1.Body)('token_type_hint')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "revoke", null);
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