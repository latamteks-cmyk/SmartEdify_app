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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const authorization_code_store_service_1 = require("./store/authorization-code-store.service");
const crypto = __importStar(require("crypto"));
const jose = __importStar(require("node-jose"));
const jose_1 = require("jose");
const tokens_service_1 = require("../tokens/tokens.service");
const users_service_1 = require("../users/users.service");
const sessions_service_1 = require("../sessions/sessions.service");
const par_store_service_1 = require("./store/par-store.service");
const device_code_store_service_1 = require("./store/device-code-store.service");
const refresh_token_entity_1 = require("../tokens/entities/refresh-token.entity");
const key_management_service_1 = require("../keys/services/key-management.service");
const jti_store_service_1 = require("./store/jti-store.service");
const dpop_config_1 = require("../../config/dpop.config");
const client_store_service_1 = require("../clients/client-store.service");
let AuthService = AuthService_1 = class AuthService {
    authorizationCodeStore;
    tokensService;
    usersService;
    sessionsService;
    parStore;
    deviceCodeStore;
    jtiStore;
    keyManagementService;
    clientStore;
    refreshTokenRepository;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(authorizationCodeStore, tokensService, usersService, sessionsService, parStore, deviceCodeStore, jtiStore, keyManagementService, clientStore, refreshTokenRepository) {
        this.authorizationCodeStore = authorizationCodeStore;
        this.tokensService = tokensService;
        this.usersService = usersService;
        this.sessionsService = sessionsService;
        this.parStore = parStore;
        this.deviceCodeStore = deviceCodeStore;
        this.jtiStore = jtiStore;
        this.keyManagementService = keyManagementService;
        this.clientStore = clientStore;
        this.refreshTokenRepository = refreshTokenRepository;
    }
    pushedAuthorizationRequest(payload) {
        const requestUri = `urn:ietf:params:oauth:request_uri:${crypto.randomBytes(32).toString('hex')}`;
        this.parStore.set(requestUri, payload);
        return { request_uri: requestUri, expires_in: 60 };
    }
    getStoredPARRequest(requestUri) {
        return this.parStore.get(requestUri) || null;
    }
    deviceAuthorizationRequest() {
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
    generateAuthorizationCode(params) {
        console.log('🔐 Generating auth code with params:', params);
        const payload = {
            code_challenge: params.code_challenge,
            code_challenge_method: params.code_challenge_method,
            scope: params.scope,
        };
        console.log('🔧 Using direct payload:', payload);
        const code = crypto.randomBytes(32).toString('hex');
        const codeData = {
            ...payload,
            userId: params.userId,
        };
        console.log('💾 Storing code:', {
            code: code.substring(0, 10) + '...',
            data: codeData,
        });
        this.authorizationCodeStore.set(code, codeData);
        return code;
    }
    async exchangeCodeForTokens(code, code_verifier, dpopProof, httpMethod, httpUrl) {
        if (!dpopProof) {
            throw new common_1.UnauthorizedException('DPoP proof is required');
        }
        console.log('🔍 Validating DPoP proof first...');
        const proof = await this.validateDpopProof(dpopProof, httpMethod, httpUrl);
        console.log('✅ DPoP validation passed');
        if (!code || !code_verifier) {
            throw new common_1.BadRequestException('Code and code_verifier are required');
        }
        console.log('🔍 Looking up authorization code:', {
            code: code?.substring(0, 10) + '...',
        });
        const storedCode = this.authorizationCodeStore.get(code);
        console.log('📋 Retrieved code data:', storedCode ? 'found' : 'NOT FOUND', storedCode);
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
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.jtiStore.register({
            tenantId: user.tenant_id,
            jkt: proof.jkt,
            jti: proof.jti,
            iat: proof.iat,
        });
        const accessToken = await this._generateAccessToken(user, proof.jkt, scope);
        const refreshToken = await this._generateRefreshToken(user, proof.jkt, scope);
        return [accessToken, refreshToken];
    }
    exchangeDeviceCodeForTokens(deviceCode) {
        throw new common_1.BadRequestException('Device code grant type not yet implemented');
    }
    async revokeToken(token, token_type_hint) {
        if (token_type_hint === 'refresh_token') {
            const hashedToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');
            const foundToken = await this.refreshTokenRepository.findOne({
                where: { token_hash: hashedToken },
            });
            if (foundToken) {
                await this.refreshTokenRepository.delete(foundToken.id);
            }
            return;
        }
    }
    async _generateAccessToken(user, jkt, scope) {
        const signingKey = await this.keyManagementService.getActiveSigningKey(user.tenant_id);
        const privateKey = await (0, jose_1.importPKCS8)(signingKey.private_key_pem, 'ES256');
        const now = Math.floor(Date.now() / 1000);
        const jti = crypto.randomUUID();
        const issuer = `https://auth.smartedify.global/t/${user.tenant_id}`;
        const token = await new jose_1.SignJWT({
            sub: user.id,
            scope,
            tenant_id: user.tenant_id,
            cnf: { jkt },
        })
            .setProtectedHeader({ alg: 'ES256', kid: signingKey.kid, typ: 'JWT' })
            .setIssuer(issuer)
            .setAudience(issuer)
            .setIssuedAt(now)
            .setNotBefore(now)
            .setExpirationTime(now + 900)
            .setJti(jti)
            .sign(privateKey);
        return token;
    }
    async _generateRefreshToken(user, jkt, scope) {
        return this.tokensService.issueRefreshToken(user, jkt, undefined, undefined, undefined, scope, undefined);
    }
    introspect(token) {
        console.log(`Introspecting token: ${token}`);
        return { active: true, sub: 'mock_user_id' };
    }
    async refreshTokens(refreshToken, dpopProof, httpMethod, httpUrl) {
        const { dpop, user } = await this.tokensService.validateRefreshTokenWithNotBefore(refreshToken, dpopProof, httpMethod, httpUrl);
        const newRefreshToken = await this.tokensService.rotateRefreshToken(refreshToken);
        const newAccessToken = await this._generateAccessToken(user, dpop.jkt, 'openid profile');
        return [newAccessToken, newRefreshToken];
    }
    async validateAccessToken(accessToken, userId, tenantId, issuedAt) {
        return this.tokensService.validateAccessToken(accessToken, userId, tenantId, issuedAt);
    }
    async validateDpopProof(dpopProof, httpMethod, httpUrl, options) {
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
            if (typeof decodedPayload.iat !== 'number') {
                throw new common_1.UnauthorizedException('Invalid or missing iat in DPoP proof');
            }
            const { proof: { maxIatSkewSeconds }, } = (0, dpop_config_1.getDpopConfig)();
            const now = Math.floor(Date.now() / 1000);
            if (Math.abs(now - decodedPayload.iat) > maxIatSkewSeconds) {
                throw new common_1.UnauthorizedException('DPoP proof expired');
            }
            if (options?.requireBinding && !options.boundJkt) {
                throw new common_1.UnauthorizedException('Token is missing cnf.jkt binding');
            }
            const thumbprintBuffer = await key.thumbprint('SHA-256');
            const computedThumbprint = Buffer.from(thumbprintBuffer).toString('hex');
            if (options?.boundJkt && options.boundJkt !== computedThumbprint) {
                throw new common_1.UnauthorizedException('DPoP proof does not match provided binding');
            }
            return {
                jkt: computedThumbprint,
                jti: decodedPayload.jti,
                iat: decodedPayload.iat,
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Invalid DPoP proof');
        }
    }
    async handleBackchannelLogout(logoutToken) {
        try {
            const parts = logoutToken.split('.');
            if (parts.length !== 3)
                throw new Error('Invalid JWT format');
            const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            const { kid } = header;
            const clientId = payload.iss;
            if (!kid || !clientId) {
                throw new common_1.UnauthorizedException('Missing kid or iss in logout token');
            }
            const client = this.clientStore.findClientById(clientId);
            if (!client) {
                this.logger.warn(`Back-channel logout attempt for unknown client: ${clientId}`);
                return;
            }
            const jwk = client.jwks.keys.find((k) => k.kid === kid);
            if (!jwk) {
                this.logger.warn(`Back-channel logout with unknown kid: ${kid} for client: ${clientId}`);
                return;
            }
            const key = await jose.JWK.asKey(jwk);
            const verifier = jose.JWS.createVerify(key);
            const verified = await verifier.verify(logoutToken);
            const verifiedPayload = JSON.parse(verified.payload.toString());
            if (!verifiedPayload.events ||
                !verifiedPayload.events['http://schemas.openid.net/event/backchannel-logout']) {
                throw new common_1.BadRequestException('Missing backchannel-logout event claim');
            }
            if (!verifiedPayload.sid) {
                throw new common_1.BadRequestException('Missing sid claim');
            }
            await this.sessionsService.revokeSession(verifiedPayload.sid);
        }
        catch (error) {
            this.logger.error(`Back-channel logout failed: ${error.message}`);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(9, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [authorization_code_store_service_1.AuthorizationCodeStoreService,
        tokens_service_1.TokensService,
        users_service_1.UsersService,
        sessions_service_1.SessionsService,
        par_store_service_1.ParStoreService,
        device_code_store_service_1.DeviceCodeStoreService,
        jti_store_service_1.JtiStoreService,
        key_management_service_1.KeyManagementService,
        client_store_service_1.ClientStoreService,
        typeorm_2.Repository])
], AuthService);
//# sourceMappingURL=auth.service.js.map