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
var KeyManagementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyManagementService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const signing_key_entity_1 = require("../entities/signing-key.entity");
const jose = __importStar(require("node-jose"));
let KeyManagementService = KeyManagementService_1 = class KeyManagementService {
    signingKeyRepository;
    logger = new common_1.Logger(KeyManagementService_1.name);
    constructor(signingKeyRepository) {
        this.signingKeyRepository = signingKeyRepository;
    }
    async generateNewKey(tenantId) {
        this.logger.log(`Generating new key for tenant ${tenantId}`);
        const key = await jose.JWK.createKey('EC', 'P-256', { alg: 'ES256', use: 'sig' });
        const signingKey = this.signingKeyRepository.create({
            tenant_id: tenantId,
            status: signing_key_entity_1.KeyStatus.ACTIVE,
            created_at: new Date(),
            updated_at: new Date(),
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            public_key_jwk: key.toJSON(),
            private_key_pem: await key.toPEM(true),
            algorithm: 'ES256',
        });
        const savedKey = await this.signingKeyRepository.save(signingKey);
        this.logger.log(`New key generated with kid: ${savedKey.kid}`);
        return savedKey;
    }
    async getActiveSigningKey(tenantId) {
        const activeKey = await this.signingKeyRepository.findOne({
            where: {
                tenant_id: tenantId,
                status: signing_key_entity_1.KeyStatus.ACTIVE,
            },
            order: {
                created_at: 'DESC',
            },
        });
        if (!activeKey) {
            this.logger.warn(`No active key found for tenant ${tenantId}, generating new one`);
            return this.generateNewKey(tenantId);
        }
        return activeKey;
    }
    async findKeyById(kid) {
        return this.signingKeyRepository.findOne({ where: { kid } });
    }
    async getJwksForTenant(tenantId) {
        const validKeys = await this.signingKeyRepository.find({
            where: {
                tenant_id: tenantId,
                status: (0, typeorm_2.In)([signing_key_entity_1.KeyStatus.ACTIVE, signing_key_entity_1.KeyStatus.ROLLED_OVER]),
            },
        });
        const jwksKeys = [];
        for (const key of validKeys) {
            try {
                const jwk = await jose.JWK.asKey(key.public_key_jwk);
                const publicJwk = jwk.toJSON();
                jwksKeys.push(publicJwk);
            }
            catch (error) {
                this.logger.error(`Failed to process key ${key.kid} for JWKS:`, error.message);
            }
        }
        return { keys: jwksKeys };
    }
};
exports.KeyManagementService = KeyManagementService;
exports.KeyManagementService = KeyManagementService = KeyManagementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(signing_key_entity_1.SigningKey)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], KeyManagementService);
//# sourceMappingURL=key-management.service.js.map