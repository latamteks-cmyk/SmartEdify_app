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
const key_management_service_1 = require("../keys/services/key-management.service");
const jose = __importStar(require("node-jose"));
let QrcodesService = class QrcodesService {
    keysService;
    constructor(keysService) {
        this.keysService = keysService;
    }
    async generateQrCode(payload) {
        const signingKey = await this.keysService.getActiveSigningKey('default');
        const key = await jose.JWK.asKey(signingKey.private_key_pem, 'pem');
        const jws = await jose.JWS.createSign({ format: 'compact', fields: { kid: signingKey.kid } }, key)
            .update(JSON.stringify(payload))
            .final();
        return qrcode.toDataURL(jws);
    }
    async validateQrCode(token) {
        try {
            const { header } = jose.JWS.split(token);
            const kid = header.kid;
            const signingKey = await this.keysService.findKeyById(kid);
            if (!signingKey) {
                return false;
            }
            const key = await jose.JWK.asKey(signingKey.public_key_jwk);
            const verifier = jose.JWS.createVerify(key);
            await verifier.verify(token);
            return true;
        }
        catch (error) {
            return false;
        }
    }
};
exports.QrcodesService = QrcodesService;
exports.QrcodesService = QrcodesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [key_management_service_1.KeyManagementService])
], QrcodesService);
//# sourceMappingURL=qrcodes.service.js.map