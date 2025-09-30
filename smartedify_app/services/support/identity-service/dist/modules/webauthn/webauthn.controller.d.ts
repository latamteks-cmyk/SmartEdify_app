import { WebauthnService } from './webauthn.service';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types';
export declare class WebauthnController {
    private readonly webauthnService;
    constructor(webauthnService: WebauthnService);
    registrationOptions(username: string): Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>;
    registrationVerification(body: RegistrationResponseJSON, userId: string, challenge?: string): Promise<import("@simplewebauthn/server").VerifiedRegistrationResponse>;
    authenticationOptions(username: string): Promise<import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON>;
    authenticationVerification(body: AuthenticationResponseJSON, challenge?: string): Promise<import("@simplewebauthn/server").VerifiedAuthenticationResponse>;
}
