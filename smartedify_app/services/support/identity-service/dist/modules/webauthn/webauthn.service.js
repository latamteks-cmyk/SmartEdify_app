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
    constructor(rpService, usersService, webAuthnCredentialRepository) {
        this.rpService = rpService;
        this.usersService = usersService;
        this.webAuthnCredentialRepository = webAuthnCredentialRepository;
    }
    async generateRegistrationOptions(username) {
        const user = await this.usersService.findByEmail(username);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const userCredentials = await this.webAuthnCredentialRepository.find({ where: { user: { id: user.id } } });
        const options = await (0, server_1.generateRegistrationOptions)({
            rpName: this.rpService.getRpName(),
            rpID: this.rpService.getRpId(),
            userID: user.id,
            userName: user.email,
            attestationType: 'none',
            excludeCredentials: userCredentials.map(cred => ({
                id: cred.credential_id,
                type: 'public-key',
                transports: cred.transports,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });
        return options;
    }
    async verifyRegistration(response, expectedChallenge) {
        const verification = await (0, server_1.verifyRegistrationResponse)({
            response,
            expectedChallenge,
            expectedOrigin: this.rpService.getExpectedOrigin(),
            expectedRPID: this.rpService.getRpId(),
        });
        if (verification.verified && verification.registrationInfo) {
            const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
            const user = await this.usersService.findByEmail('test@test.com');
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            const newCredential = this.webAuthnCredentialRepository.create({
                user,
                credential_id: credentialID,
                public_key: credentialPublicKey,
                sign_count: counter,
                rp_id: this.rpService.getRpId(),
                origin: this.rpService.getExpectedOrigin(),
            });
            await this.webAuthnCredentialRepository.save(newCredential);
        }
        return verification;
    }
    async generateAuthenticationOptions(username) {
        let allowCredentials;
        if (username) {
            const user = await this.usersService.findByEmail(username);
            if (user) {
                const userCredentials = await this.webAuthnCredentialRepository.find({ where: { user: { id: user.id } } });
                allowCredentials = userCredentials.map(cred => ({
                    id: cred.credential_id,
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
        return options;
    }
    async verifyAuthentication(response, expectedChallenge) {
        const { credentialID } = response;
        const credential = await this.webAuthnCredentialRepository.findOne({ where: { credential_id: credentialID } });
        if (!credential) {
            throw new common_1.NotFoundException('Credential not found');
        }
        const verification = await (0, server_1.verifyAuthenticationResponse)({
            response,
            expectedChallenge,
            expectedOrigin: this.rpService.getExpectedOrigin(),
            expectedRPID: this.rpService.getRpId(),
            authenticator: {
                credentialID: credential.credential_id,
                credentialPublicKey: credential.public_key,
                counter: credential.sign_count,
            },
        });
        if (verification.verified) {
            credential.sign_count = verification.authenticationInfo.newCounter;
            await this.webAuthnCredentialRepository.save(credential);
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