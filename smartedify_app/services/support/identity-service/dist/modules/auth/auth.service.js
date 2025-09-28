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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const authorization_code_store_service_1 = require("./store/authorization-code-store.service");
const crypto = __importStar(require("crypto"));
const jose = __importStar(require("node-jose"));
const tokens_service_1 = require("../tokens/tokens.service");
const users_service_1 = require("../users/users.service");
const sessions_service_1 = require("../sessions/sessions.service");
const par_store_service_1 = require("./store/par-store.service");
const device_code_store_service_1 = require("./store/device-code-store.service");
const refresh_token_entity_1 = require("../tokens/entities/refresh-token.entity");
const jti_store_service_1 = require("./store/jti-store.service");
let AuthService = class AuthService {
    authorizationCodeStore;
    tokensService;
    usersService;
    sessionsService;
    parStore;
    deviceCodeStore;
    jtiStore;
    refreshTokenRepository;
    constructor(authorizationCodeStore, tokensService, usersService, sessionsService, parStore, deviceCodeStore, jtiStore, refreshTokenRepository) {
        this.authorizationCodeStore = authorizationCodeStore;
        this.tokensService = tokensService;
        this.usersService = usersService;
        this.sessionsService = sessionsService;
        this.parStore = parStore;
        this.deviceCodeStore = deviceCodeStore;
        this.jtiStore = jtiStore;
        this.refreshTokenRepository = refreshTokenRepository;
    }
    async pushedAuthorizationRequest(payload) {
        const requestUri = `urn:ietf:params:oauth:request_uri:${crypto.randomBytes(32).toString('hex')}`;
        this.parStore.set(requestUri, payload);
        return { request_uri: requestUri, expires_in: 60 };
    }
    async deviceAuthorizationRequest() {
        const device_code = crypto.randomBytes(32).toString('hex');
        const user_code = crypto.randomBytes(4).toString('hex').toUpperCase();
        const expiresIn = 1800;
        this.deviceCodeStore.set(device_code, {
            user_code,
            status: device_code_store_service_1.DeviceCodeStatus.PENDING,
        }, expiresIn);
        return {
            device_code,
            user_code,
            verification_uri: 'https://example.com/device',
            expires_in: expiresIn,
            interval: 5,
        };
    }
    async generateAuthorizationCode(params) {
        let payload;
        if (params.request_uri) {
            const storedPayload = this.parStore.get(params.request_uri);
            if (!storedPayload) {
                throw new common_1.BadRequestException('Invalid or expired request_uri');
            }
            payload = { ...storedPayload, scope: params.scope };
        }
        else if (params.code_challenge && params.code_challenge_method) {
            payload = {
                code_challenge: params.code_challenge,
                code_challenge_method: params.code_challenge_method,
                scope: params.scope,
            };
        }
        else {
            throw new common_1.BadRequestException('Either request_uri or PKCE parameters are required');
        }
        const code = crypto.randomBytes(32).toString('hex');
        this.authorizationCodeStore.set(code, {
            ...payload,
            userId: params.userId,
        });
        return code;
    }
    async exchangeCodeForTokens(code, code_verifier, dpopProof, httpMethod, httpUrl) {
        const storedCode = this.authorizationCodeStore.get(code);
        if (!storedCode) {
            throw new common_1.BadRequestException('Invalid authorization code');
        }
        const { code_challenge, code_challenge_method, userId, scope } = storedCode;
        let challenge;
        if (code_challenge_method === 'S256') {
            challenge = crypto
                .createHash('sha256')
                .update(code_verifier)
                .digest('base64url');
        }
        else {
            challenge = code_verifier;
        }
        if (challenge !== code_challenge) {
            throw new common_1.UnauthorizedException('Invalid code verifier');
        }
        if (!dpopProof) {
            throw new common_1.UnauthorizedException('DPoP proof is required');
        }
        const jkt = await this.validateDpopProof(dpopProof, httpMethod, httpUrl);
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const accessToken = await this._generateAccessToken(user, jkt, scope);
        const refreshToken = await this._generateRefreshToken(user, jkt, scope);
        return [accessToken, refreshToken];
    }
    async exchangeDeviceCodeForTokens(deviceCode) {
        throw new common_1.BadRequestException('Device code grant type not yet implemented');
    }
    async revokeToken(token, token_type_hint) {
        if (token_type_hint === 'refresh_token') {
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
            const foundToken = await this.refreshTokenRepository.findOne({ where: { token_hash: hashedToken } });
            if (foundToken) {
                await this.refreshTokenRepository.delete(foundToken.id);
            }
            return;
        }
    }
    async _generateAccessToken(user, jkt, scope) {
        const accessToken = 'mock_access_token';
        return accessToken;
    }
    async _generateRefreshToken(user, jkt, scope) {
        return this.tokensService.issueRefreshToken(user, jkt, undefined, undefined, undefined, scope);
    }
    async introspect(token) {
        console.log(`Introspecting token: ${token}`);
        return { active: true, sub: 'mock_user_id' };
    }
    async refreshTokens(refreshToken, dpopProof, httpMethod, httpUrl) {
        const user = await this.tokensService.validateRefreshTokenWithNotBefore(refreshToken, dpopProof, httpMethod, httpUrl);
        const newRefreshToken = await this.tokensService.rotateRefreshToken(refreshToken);
        const jkt = await this.validateDpopProof(dpopProof, httpMethod, httpUrl);
        const newAccessToken = await this._generateAccessToken(user, jkt, 'openid profile');
        return [newAccessToken, newRefreshToken];
    }
    async validateAccessToken(accessToken, userId, tenantId, issuedAt) {
        return this.tokensService.validateAccessToken(accessToken, userId, tenantId, issuedAt);
    }
    async validateDpopProof(dpopProof, httpMethod, httpUrl) {
        try {
            const parts = dpopProof.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWS format');
            }
            const headerBase64 = parts[0];
            const header = JSON.parse(Buffer.from(headerBase64, 'base64url').toString());
            const jwk = header.jwk;
            if (!jwk) {
                throw new Error('Missing jwk in header');
            }
            const key = await jose.JWK.asKey(jwk);
            const verifier = jose.JWS.createVerify(key);
            const verified = await verifier.verify(dpopProof);
            const decodedPayload = JSON.parse(verified.payload.toString());
            if (decodedPayload.htm !== httpMethod) {
                throw new common_1.UnauthorizedException('Invalid DPoP htm claim');
            }
            if (decodedPayload.htu !== httpUrl) {
                throw new common_1.UnauthorizedException('Invalid DPoP htu claim');
            }
            if (!decodedPayload.jti || typeof decodedPayload.jti !== 'string') {
                throw new common_1.UnauthorizedException('Invalid or missing jti in DPoP proof');
            }
            if (this.jtiStore.has(decodedPayload.jti)) {
                throw new common_1.UnauthorizedException('DPoP proof replay detected');
            }
            this.jtiStore.set(decodedPayload.jti);
            const thumbprintBuffer = await key.thumbprint('SHA-256');
            return Buffer.from(thumbprintBuffer).toString('hex');
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Invalid DPoP proof');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(7, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [authorization_code_store_service_1.AuthorizationCodeStoreService,
        tokens_service_1.TokensService,
        users_service_1.UsersService,
        sessions_service_1.SessionsService,
        par_store_service_1.ParStoreService,
        device_code_store_service_1.DeviceCodeStoreService,
        jti_store_service_1.JtiStoreService,
        typeorm_2.Repository])
], AuthService);
//# sourceMappingURL=auth.service.js.map