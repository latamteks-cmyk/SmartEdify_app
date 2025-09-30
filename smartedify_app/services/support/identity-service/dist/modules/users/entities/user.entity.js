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
exports.User = void 0;
const typeorm_1 = require("typeorm");
let User = class User {
    id;
    tenant_id;
    username;
    email;
    phone;
    password;
    mfa_secret;
    status;
    email_verified_at;
    phone_verified_at;
    preferred_login;
    created_at;
    updated_at;
    get isEmailVerified() {
        return this.email_verified_at !== null;
    }
    get isPhoneVerified() {
        return this.phone_verified_at !== null;
    }
    get isActive() {
        return this.status === 'ACTIVE';
    }
    get hasPassword() {
        return this.password !== null && this.password !== undefined;
    }
    get hasMfaEnabled() {
        return this.mfa_secret !== null && this.mfa_secret !== undefined;
    }
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { comment: 'Reference to tenant in tenancy-service' }),
    __metadata("design:type", String)
], User.prototype, "tenant_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ comment: 'Unique username within tenant scope' }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({
        comment: 'Email address, used for authentication and verification',
    }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        comment: 'Phone number in E.164 format, used for OTP verification',
    }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        comment: 'Argon2id hashed password, nullable for passwordless users',
    }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, comment: 'TOTP secret for MFA, encrypted at rest' }),
    __metadata("design:type", String)
], User.prototype, "mfa_secret", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'ACTIVE', comment: 'User account status' }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: true,
        comment: 'Timestamp when email was verified',
    }),
    __metadata("design:type", Object)
], User.prototype, "email_verified_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamptz',
        nullable: true,
        comment: 'Timestamp when phone was verified',
    }),
    __metadata("design:type", Object)
], User.prototype, "phone_verified_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        comment: 'Preferred authentication method for this user',
    }),
    __metadata("design:type", Object)
], User.prototype, "preferred_login", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], User.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], User.prototype, "updated_at", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users'),
    (0, typeorm_1.Unique)(['tenant_id', 'username']),
    (0, typeorm_1.Unique)(['tenant_id', 'email']),
    (0, typeorm_1.Check)('CHK_users_status', `status IN ('ACTIVE', 'INACTIVE', 'LOCKED')`),
    (0, typeorm_1.Check)('CHK_users_preferred_login', `preferred_login IN ('PASSWORD', 'TOTP', 'WEBAUTHN')`)
], User);
//# sourceMappingURL=user.entity.js.map