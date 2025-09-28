import { WebauthnService } from './webauthn.service';
export declare class WebauthnController {
    private readonly webauthnService;
    constructor(webauthnService: WebauthnService);
    registrationOptions(username: string): Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>;
    registrationVerification(body: any, userId: string): Promise<import("@simplewebauthn/server").VerifiedRegistrationResponse>;
    authenticationOptions(username: string): Promise<import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON>;
    authenticationVerification(body: any, username: string): Promise<import("@simplewebauthn/server").VerifiedAuthenticationResponse>;
}
