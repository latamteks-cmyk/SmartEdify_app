"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokensService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
const sessions_service_1 = require("../sessions/sessions.service");
const crypto = __importStar(require("crypto"));
const auth_service_1 = require("../auth/auth.service");
let TokensService = class TokensService {
    refreshTokensRepository;
    authService;
    sessionsService;
    constructor(refreshTokensRepository, authService, sessionsService) {
        this.refreshTokensRepository = refreshTokensRepository;
        this.authService = authService;
        this.sessionsService = sessionsService;
    }
    async issueRefreshToken(user, jkt, familyId, clientId, deviceId, scope) {
        const token = crypto.randomBytes(32).toString('hex');
        const token_hash = crypto.createHash('sha256').update(token).digest('hex');
        const newRefreshToken = this.refreshTokensRepository.create({
            user,
            token_hash,
            jkt,
            family_id: familyId || crypto.randomUUID(),
            client_id: clientId || 'test-client-id',
            device_id: deviceId || 'test-device-id',
            session_id: crypto.randomUUID(),
            scope: scope || 'openid profile',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
        await this.refreshTokensRepository.save(newRefreshToken);
        return token;
    }
    async rotateRefreshToken(oldToken) {
        const oldTokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');
        const oldRefreshToken = await this.refreshTokensRepository.findOne({ where: { token_hash: oldTokenHash }, relations: ['user'] });
        if (!oldRefreshToken || oldRefreshToken.revoked) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (oldRefreshToken.used_at) {
            console.warn(`Refresh token reuse detected for family: ${oldRefreshToken.family_id}`);
            await this.revokeTokenFamily(oldRefreshToken.family_id, 'reuse_detected');
            throw new common_1.UnauthorizedException('Refresh token reuse detected - token family revoked');
        }
        if (oldRefreshToken.expires_at < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token has expired');
        }
        oldRefreshToken.used_at = new Date();
        await this.refreshTokensRepository.save(oldRefreshToken);
        const newToken = await this.issueRefreshToken(oldRefreshToken.user, oldRefreshToken.jkt, oldRefreshToken.family_id, oldRefreshToken.client_id, oldRefreshToken.device_id, oldRefreshToken.scope);
        const newRefreshTokenEntity = await this.refreshTokensRepository.findOne({
            where: { token_hash: crypto.createHash('sha256').update(newToken).digest('hex') }
        });
        if (newRefreshTokenEntity) {
            oldRefreshToken.replaced_by_id = newRefreshTokenEntity.id;
            newRefreshTokenEntity.parent_id = oldRefreshToken.id;
            await this.refreshTokensRepository.save([oldRefreshToken, newRefreshTokenEntity]);
        }
        return newToken;
    }
    async validateRefreshToken(token, dpopProof, httpMethod, httpUrl) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const refreshToken = await this.refreshTokensRepository.findOne({ where: { token_hash: tokenHash }, relations: ['user'] });
        if (!refreshToken || refreshToken.revoked || refreshToken.used_at) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (!dpopProof) {
            throw new common_1.UnauthorizedException('DPoP proof is required for refresh token validation');
        }
        const incomingJkt = await this.authService.validateDpopProof(dpopProof, httpMethod, httpUrl);
        if (incomingJkt !== refreshToken.jkt) {
            throw new common_1.UnauthorizedException('DPoP proof does not match refresh token binding');
        }
        return refreshToken.user;
    }
    async revokeTokenFamily(familyId, reason) {
        await this.refreshTokensRepository.update({ family_id: familyId }, {
            revoked: true,
            revoked_reason: reason,
        });
        console.log(`Revoked token family: ${familyId} due to: ${reason}`);
    }
    async revokeRefreshToken(tokenHash, reason) {
        await this.refreshTokensRepository.update({ token_hash: tokenHash }, {
            revoked: true,
            revoked_reason: reason,
        });
    }
    async validateAccessToken(accessToken, userId, tenantId, issuedAt) {
        try {
            const notBeforeTime = await this.sessionsService.getNotBeforeTime(userId, tenantId);
            if (notBeforeTime && issuedAt < notBeforeTime) {
                console.warn(`Access token rejected: issued before last logout. UserId: ${userId}, TenantId: ${tenantId}, IssuedAt: ${issuedAt}, NotBefore: ${notBeforeTime}`);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error(`Error validating access token for user ${userId}:`, error);
            return false;
        }
    }
    async validateRefreshTokenWithNotBefore(token, dpopProof, httpMethod, httpUrl) {
        const user = await this.validateRefreshToken(token, dpopProof, httpMethod, httpUrl);
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const refreshToken = await this.refreshTokensRepository.findOne({
            where: { token_hash: tokenHash },
            relations: ['user']
        });
        if (refreshToken) {
            const notBeforeTime = await this.sessionsService.getNotBeforeTime(user.id, user.tenant_id);
            if (notBeforeTime && refreshToken.created_at < notBeforeTime) {
                console.warn(`Refresh token rejected: created before last logout. UserId: ${user.id}, TenantId: ${user.tenant_id}, TokenCreatedAt: ${refreshToken.created_at}, NotBefore: ${notBeforeTime}`);
                throw new common_1.UnauthorizedException('Refresh token invalidated due to user logout');
            }
        }
        return user;
    }
};
exports.TokensService = TokensService;
exports.TokensService = TokensService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => auth_service_1.AuthService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        auth_service_1.AuthService,
        sessions_service_1.SessionsService])
], TokensService);
//# sourceMappingURL=tokens.service.js.map