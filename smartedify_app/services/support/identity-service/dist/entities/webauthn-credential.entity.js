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
exports.WebAuthnCredential = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
let WebAuthnCredential = class WebAuthnCredential {
    id;
    user;
    credential_id;
    public_key;
    sign_count;
    rp_id;
    origin;
    aaguid;
    attestation_fmt;
    transports;
    backup_eligible;
    backup_state;
    cred_protect;
    last_used_at;
    created_at;
};
exports.WebAuthnCredential = WebAuthnCredential;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WebAuthnCredential.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], WebAuthnCredential.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bytea' }),
    __metadata("design:type", Buffer)
], WebAuthnCredential.prototype, "credential_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bytea' }),
    __metadata("design:type", Buffer)
], WebAuthnCredential.prototype, "public_key", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { default: 0 }),
    __metadata("design:type", Number)
], WebAuthnCredential.prototype, "sign_count", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], WebAuthnCredential.prototype, "rp_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], WebAuthnCredential.prototype, "origin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bytea', nullable: true }),
    __metadata("design:type", Buffer)
], WebAuthnCredential.prototype, "aaguid", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebAuthnCredential.prototype, "attestation_fmt", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { array: true, nullable: true }),
    __metadata("design:type", Array)
], WebAuthnCredential.prototype, "transports", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Boolean)
], WebAuthnCredential.prototype, "backup_eligible", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebAuthnCredential.prototype, "backup_state", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebAuthnCredential.prototype, "cred_protect", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], WebAuthnCredential.prototype, "last_used_at", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebAuthnCredential.prototype, "created_at", void 0);
exports.WebAuthnCredential = WebAuthnCredential = __decorate([
    (0, typeorm_1.Entity)('webauthn_credentials'),
    (0, typeorm_1.Unique)(['user', 'credential_id'])
], WebAuthnCredential);
//# sourceMappingURL=webauthn-credential.entity.js.map