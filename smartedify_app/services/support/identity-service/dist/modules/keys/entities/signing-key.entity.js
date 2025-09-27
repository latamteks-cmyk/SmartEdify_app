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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SigningKey = exports.KeyStatus = void 0;
const typeorm_1 = require("typeorm");
var KeyStatus;
(function (KeyStatus) {
    KeyStatus["ACTIVE"] = "ACTIVE";
    KeyStatus["ROLLED_OVER"] = "ROLLED_OVER";
    KeyStatus["EXPIRED"] = "EXPIRED";
})(KeyStatus || (exports.KeyStatus = KeyStatus = {}));
let SigningKey = class SigningKey {
    kid;
    tenant_id;
    public_key_jwk;
    private_key_pem;
    algorithm;
    status;
    expires_at;
    created_at;
    updated_at;
};
exports.SigningKey = SigningKey;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SigningKey.prototype, "kid", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], SigningKey.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], SigningKey.prototype, "public_key_jwk", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SigningKey.prototype, "private_key_pem", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'ES256' }),
    __metadata("design:type", String)
], SigningKey.prototype, "algorithm", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: KeyStatus,
        default: KeyStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], SigningKey.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], SigningKey.prototype, "expires_at", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SigningKey.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SigningKey.prototype, "updated_at", void 0);
exports.SigningKey = SigningKey = __decorate([
    (0, typeorm_1.Entity)('signing_keys'),
    (0, typeorm_1.Index)(['tenant_id', 'status'])
], SigningKey);
//# sourceMappingURL=signing-key.entity.js.map