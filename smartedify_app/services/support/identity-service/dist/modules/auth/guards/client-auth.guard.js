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
exports.ClientAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jose = __importStar(require("node-jose"));
const client_store_service_1 = require("../../clients/client-store.service");
let ClientAuthGuard = class ClientAuthGuard {
    clientStore;
    constructor(clientStore) {
        this.clientStore = clientStore;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const { client_assertion, client_assertion_type } = req.body || {};
        if (!client_assertion ||
            client_assertion_type !==
                'urn:ietf:params:oauth:client-assertion-type:jwt-bearer') {
            throw new common_1.BadRequestException('Invalid client authentication method.');
        }
        try {
            const parts = client_assertion.split('.');
            if (parts.length !== 3)
                throw new Error('Invalid JWT format');
            const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            const { kid } = header;
            const clientId = payload.iss;
            if (!kid || !clientId) {
                throw new common_1.UnauthorizedException('Missing kid or iss in client assertion');
            }
            const client = this.clientStore.findClientById(clientId);
            if (!client) {
                throw new common_1.UnauthorizedException(`Unknown client: ${clientId}`);
            }
            const jwk = client.jwks?.keys?.find((k) => k.kid === kid);
            if (!jwk) {
                throw new common_1.UnauthorizedException('Unknown key identifier (kid)');
            }
            const key = await jose.JWK.asKey(jwk);
            const verifier = jose.JWS.createVerify(key);
            const verified = await verifier.verify(client_assertion);
            const verifiedPayload = JSON.parse(verified.payload.toString());
            const now = Math.floor(Date.now() / 1000);
            if (!verifiedPayload.exp || verifiedPayload.exp < now) {
                throw new common_1.UnauthorizedException('Client assertion has expired');
            }
            const tokenEndpointUrl = `${req.protocol || 'https'}://${req.get?.('host') || 'localhost'}${req.originalUrl || '/'}`;
            if (verifiedPayload.aud !== tokenEndpointUrl) {
                throw new common_1.UnauthorizedException('Invalid audience for client assertion');
            }
            if (verifiedPayload.iss !== clientId ||
                verifiedPayload.sub !== clientId) {
                throw new common_1.UnauthorizedException('Invalid issuer or subject for client assertion');
            }
            return true;
        }
        catch (error) {
            throw new common_1.UnauthorizedException(`Client assertion validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
};
exports.ClientAuthGuard = ClientAuthGuard;
exports.ClientAuthGuard = ClientAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [client_store_service_1.ClientStoreService])
], ClientAuthGuard);
//# sourceMappingURL=client-auth.guard.js.map