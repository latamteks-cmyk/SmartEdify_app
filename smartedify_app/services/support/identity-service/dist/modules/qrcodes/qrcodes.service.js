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
exports.QrcodesService = void 0;
const common_1 = require("@nestjs/common");
const qrcode = __importStar(require("qrcode"));
const jose = __importStar(require("node-jose"));
const key_management_service_1 = require("../keys/services/key-management.service");
let QrcodesService = class QrcodesService {
    keyManagementService;
    constructor(keyManagementService) {
        this.keyManagementService = keyManagementService;
    }
    async generateQrCode(payload) {
        const signingKeyEntity = await this.keyManagementService.getActiveSigningKey('default');
        const key = await jose.JWK.asKey(signingKeyEntity.private_key_pem, 'pem');
        const options = {
            format: 'compact',
            fields: {
                alg: 'ES256',
                kid: signingKeyEntity.kid,
            },
        };
        const jwsResult = await jose.JWS.createSign(options, key)
            .update(JSON.stringify(payload))
            .final();
        return await qrcode.toDataURL(jwsResult);
    }
    async validateQrCode(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWS format');
            }
            const headerBase64 = parts[0];
            const header = JSON.parse(Buffer.from(headerBase64, 'base64url').toString());
            const kid = header.kid;
            if (!kid) {
                throw new Error('Missing kid in JWS header');
            }
            const signingKeyEntity = await this.keyManagementService.findKeyById(kid);
            if (!signingKeyEntity) {
                throw new Error(`Signing key with kid ${kid} not found`);
            }
            const publicKey = await jose.JWK.asKey(signingKeyEntity.public_key_jwk);
            const verifier = jose.JWS.createVerify(publicKey);
            const verified = await verifier.verify(token);
            if (verified.protected.kid !== kid) {
                throw new Error('JWS header kid mismatch');
            }
            return JSON.parse(verified.payload.toString());
        }
        catch (error) {
            throw new Error(`Invalid QR Code: ${error.message}`);
        }
    }
};
exports.QrcodesService = QrcodesService;
exports.QrcodesService = QrcodesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [key_management_service_1.KeyManagementService])
], QrcodesService);
//# sourceMappingURL=qrcodes.service.js.map