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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebauthnService = void 0;
const common_1 = require("@nestjs/common");
const server_1 = require("@simplewebauthn/server");
const rp_service_1 = require("./rp.service");
const users_service_1 = require("../users/users.service");
const typeorm_1 = require("@nestjs/typeorm");
const webauthn_credential_entity_1 = require("./entities/webauthn-credential.entity");
const typeorm_2 = require("typeorm");
let WebauthnService = class WebauthnService {
    rpService;
    usersService;
    webAuthnCredentialRepository;
    challengeTtlMs = 1000 * 60 * 5;
    challengeStore = new Map();
    constructor(rpService, usersService, webAuthnCredentialRepository) {
        this.rpService = rpService;
        this.usersService = usersService;
        this.webAuthnCredentialRepository = webAuthnCredentialRepository;
    }
    getChallengeKey(type, subjectId) {
        return `${type}:${subjectId}`;
    }
    setChallenge(type, subjectId, challenge) {
        const key = this.getChallengeKey(type, subjectId);
        this.challengeStore.set(key, {
            challenge,
            expiresAt: Date.now() + this.challengeTtlMs,
        });
    }
    getChallenge(type, subjectId) {
        const key = this.getChallengeKey(type, subjectId);
        const stored = this.challengeStore.get(key);
        if (!stored)
            return null;
        if (stored.expiresAt <= Date.now()) {
            this.challengeStore.delete(key);
            return null;
        }
        return stored.challenge;
    }
    deleteChallenge(type, subjectId) {
        const key = this.getChallengeKey(type, subjectId);
        this.challengeStore.delete(key);
    }
    toBuffer(value, encoding = 'base64url') {
        if (Buffer.isBuffer(value))
            return Buffer.from(value);
        if (value instanceof Uint8Array)
            return Buffer.from(value);
        if (typeof value === 'string') {
            if (encoding === 'base64url')
                return Buffer.from(value, 'base64url');
            return Buffer.from(value, encoding);
        }
        if (value === undefined || value === null)
            return Buffer.alloc(0);
        throw new TypeError('Invalid value for toBuffer: must be Buffer, Uint8Array, or string');
    }
    async generateRegistrationOptions(username) {
        const user = await this.usersService.findByEmail(username);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const userCredentials = await this.webAuthnCredentialRepository.find({
            where: { user: { id: user.id } },
        });
        const options = await (0, server_1.generateRegistrationOptions)({
            rpName: this.rpService.getRpName(),
            rpID: this.rpService.getRpId(),
            userID: Buffer.from(user.id.toString()),
            userName: user.email,
            attestationType: 'none',
            excludeCredentials: userCredentials.map((cred) => ({
                id: cred.credential_id.toString('base64url'),
                type: 'public-key',
                transports: cred.transports,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });
        if (options.challenge) {
            this.setChallenge('registration', user.id, options.challenge);
        }
        return options;
    }
    async verifyRegistration(response, userId, providedChallenge) {
        if (!userId)
            throw new common_1.BadRequestException('User identifier is required');
        if (!providedChallenge)
            throw new common_1.BadRequestException('Registration challenge is required');
        const storedChallenge = this.getChallenge('registration', userId);
        if (!storedChallenge || storedChallenge !== providedChallenge) {
            throw new common_1.BadRequestException('Invalid or expired registration challenge');
        }
        const verification = await (0, server_1.verifyRegistrationResponse)({
            response,
            expectedChallenge: storedChallenge,
            expectedOrigin: this.rpService.getExpectedOrigin(),
            expectedRPID: this.rpService.getRpId(),
        });
        if (verification.verified && verification.registrationInfo) {
            const user = await this.usersService.findById(userId);
            if (!user)
                throw new common_1.NotFoundException('User not found');
            await this.persistCredential(verification.registrationInfo, response, user);
            this.deleteChallenge('registration', userId);
        }
        return verification;
    }
    async persistCredential(registrationInfo, response, user) {
        const credentialID = registrationInfo.credentialID || registrationInfo.credential?.id;
        const credentialPublicKey = registrationInfo.credentialPublicKey || registrationInfo.credential?.publicKey;
        const counter = registrationInfo.counter ?? registrationInfo.credential?.counter;
        const transports = registrationInfo.transports || registrationInfo.credential?.transports;
        const { aaguid, fmt, credentialDeviceType, credentialBackedUp, authenticatorExtensionResults } = registrationInfo;
        let credProtect = undefined;
        const ext = registrationInfo.authenticatorExtensionResults;
        if (ext && typeof ext === 'object' && 'credProtect' in ext) {
            credProtect = String(ext.credProtect);
        }
        const newCredential = this.webAuthnCredentialRepository.create({
            user,
            credential_id: this.toBuffer(credentialID ?? Buffer.alloc(0)),
            public_key: this.toBuffer(credentialPublicKey ?? Buffer.alloc(0)),
            sign_count: counter ?? 0,
            rp_id: this.rpService.getRpId(),
            origin: this.rpService.getExpectedOrigin(),
            aaguid: aaguid && typeof aaguid === 'string'
                ? Buffer.from(aaguid.replace(/-/g, ''), 'hex')
                : undefined,
            attestation_fmt: fmt,
            transports: transports || response.response?.transports,
            backup_eligible: credentialDeviceType === 'multiDevice',
            backup_state: credentialBackedUp ? 'backed_up' : 'not_backed_up',
            cred_protect: credProtect,
        });
        await this.webAuthnCredentialRepository.save(newCredential);
    }
    async generateAuthenticationOptions(username) {
        let allowCredentials;
        let user;
        if (username) {
            user = await this.usersService.findByEmail(username);
            if (user) {
                const userCredentials = await this.webAuthnCredentialRepository.find({
                    where: { user: { id: user.id } },
                });
                allowCredentials = userCredentials.map((cred) => ({
                    id: cred.credential_id.toString('base64url'),
                    type: 'public-key',
                    transports: cred.transports,
                }));
            }
        }
        const options = await (0, server_1.generateAuthenticationOptions)({
            rpID: this.rpService.getRpId(),
            userVerification: 'preferred',
            allowCredentials,
        });
        if (user && options.challenge) {
            this.setChallenge('authentication', user.id, options.challenge);
        }
        return options;
    }
    async verifyAuthentication(response, providedChallenge) {
        if (!providedChallenge)
            throw new common_1.BadRequestException('Authentication challenge is required');
        const credentialIdSource = response?.credentialID || response?.id || response?.rawId;
        if (!credentialIdSource)
            throw new common_1.BadRequestException('Credential ID is required');
        const credentialIdBuffer = this.toBuffer(credentialIdSource, 'base64url');
        const credential = await this.webAuthnCredentialRepository.findOne({
            where: { credential_id: credentialIdBuffer },
            relations: ['user'],
        });
        if (!credential)
            throw new common_1.NotFoundException('Credential not found');
        const storedChallenge = this.getChallenge('authentication', credential.user.id);
        if (!storedChallenge || storedChallenge !== providedChallenge) {
            throw new common_1.BadRequestException('Invalid or expired authentication challenge');
        }
        const verification = await (0, server_1.verifyAuthenticationResponse)({
            response,
            expectedChallenge: storedChallenge,
            expectedOrigin: this.rpService.getExpectedOrigin(),
            expectedRPID: this.rpService.getRpId(),
            credential: {
                id: Buffer.from(credential.credential_id).toString('base64url'),
                publicKey: new Uint8Array(credential.public_key),
                counter: credential.sign_count,
                transports: credential.transports,
            },
        });
        if (verification.verified) {
            credential.sign_count = verification.authenticationInfo.newCounter;
            credential.last_used_at = new Date();
            await this.webAuthnCredentialRepository.save(credential);
            this.deleteChallenge('authentication', credential.user.id);
        }
        return verification;
    }
};
exports.WebauthnService = WebauthnService;
exports.WebauthnService = WebauthnService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(webauthn_credential_entity_1.WebAuthnCredential)),
    __metadata("design:paramtypes", [rp_service_1.RpService,
        users_service_1.UsersService,
        typeorm_2.Repository])
], WebauthnService);
//# sourceMappingURL=webauthn.service.js.map