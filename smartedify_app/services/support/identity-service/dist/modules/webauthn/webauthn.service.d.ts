import { RpService } from './rp.service';
import { UsersService } from '../users/users.service';
import { WebAuthnCredential } from './entities/webauthn-credential.entity';
import { Repository } from 'typeorm';
export declare class WebauthnService {
    private readonly rpService;
    private readonly usersService;
    private webAuthnCredentialRepository;
    constructor(rpService: RpService, usersService: UsersService, webAuthnCredentialRepository: Repository<WebAuthnCredential>);
    generateRegistrationOptions(username: string): Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>;
    verifyRegistration(response: any, expectedChallenge: string): Promise<import("@simplewebauthn/server").VerifiedRegistrationResponse>;
    generateAuthenticationOptions(username?: string): Promise<import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON>;
    verifyAuthentication(response: any, expectedChallenge: string): Promise<import("@simplewebauthn/server").VerifiedAuthenticationResponse>;
}
