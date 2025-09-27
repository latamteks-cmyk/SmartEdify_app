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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const authorization_code_store_service_1 = require("./store/authorization-code-store.service");
const crypto = __importStar(require("crypto"));
const jose = __importStar(require("node-jose"));
const tokens_service_1 = require("../tokens/tokens.service");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    authorizationCodeStore;
    tokensService;
    usersService;
    constructor(authorizationCodeStore, tokensService, usersService) {
        this.authorizationCodeStore = authorizationCodeStore;
        this.tokensService = tokensService;
        this.usersService = usersService;
    }
    async generateAuthorizationCode(code_challenge, code_challenge_method, userId) {
        const code = crypto.randomBytes(32).toString('hex');
        this.authorizationCodeStore.set(code, {
            code_challenge,
            code_challenge_method,
            userId,
        });
        return code;
    }
    async generateAccessToken(code, code_verifier, dpopProof, httpMethod, httpUrl) {
        const storedCode = this.authorizationCodeStore.get(code);
        if (!storedCode) {
            throw new common_1.BadRequestException('Invalid authorization code');
        }
        const { code_challenge, code_challenge_method } = storedCode;
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
        const accessToken = 'mock_access_token';
        return accessToken;
    }
    async generateRefreshToken(code) {
        const storedCode = this.authorizationCodeStore.get(code);
        if (!storedCode) {
            throw new common_1.BadRequestException('Invalid authorization code');
        }
        const user = await this.usersService.findById(storedCode.userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const jkt = 'mock_jkt';
        return this.tokensService.issueRefreshToken(user, jkt);
    }
    async introspect(token) {
        console.log(`Introspecting token: ${token}`);
        return { active: true, sub: 'mock_user_id' };
    }
    async validateDpopProof(dpopProof, httpMethod, httpUrl) {
        try {
            const { header, payload } = jose.JWS.split(dpopProof);
            const jwk = header.jwk;
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
            return jose.JWK.thumbprint(jwk, 'sha256');
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid DPoP proof');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [authorization_code_store_service_1.AuthorizationCodeStoreService,
        tokens_service_1.TokensService,
        users_service_1.UsersService])
], AuthService);
//# sourceMappingURL=auth.service.js.map