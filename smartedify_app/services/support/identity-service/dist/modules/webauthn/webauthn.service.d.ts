import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types';
import { RpService } from './rp.service';
import { UsersService } from '../users/users.service';
import { WebAuthnCredential } from './entities/webauthn-credential.entity';
import { Repository } from 'typeorm';
export declare class WebauthnService {
    private readonly rpService;
    private readonly usersService;
    private webAuthnCredentialRepository;
    private readonly challengeTtlMs;
    private readonly challengeStore;
    constructor(rpService: RpService, usersService: UsersService, webAuthnCredentialRepository: Repository<WebAuthnCredential>);
    private getChallengeKey;
    private setChallenge;
    private getChallenge;
    private deleteChallenge;
    private toBuffer;
    generateRegistrationOptions(username: string): Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>;
    verifyRegistration(response: RegistrationResponseJSON, userId: string, providedChallenge: string): Promise<import("@simplewebauthn/server").VerifiedRegistrationResponse>;
    private persistCredential;
    generateAuthenticationOptions(username?: string): Promise<import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON>;
    verifyAuthentication(response: AuthenticationResponseJSON, providedChallenge: string): Promise<import("@simplewebauthn/server").VerifiedAuthenticationResponse>;
}
