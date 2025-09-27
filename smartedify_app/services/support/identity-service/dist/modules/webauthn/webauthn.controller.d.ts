import { WebauthnService } from './webauthn.service';
export declare class WebauthnController {
    private readonly webauthnService;
    constructor(webauthnService: WebauthnService);
    registrationOptions(username: string, userId: string): Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>;
    registrationVerification(body: any): Promise<import("@simplewebauthn/server").VerifiedRegistrationResponse>;
    authenticationOptions(): Promise<import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON>;
    authenticationVerification(body: any): Promise<import("@simplewebauthn/server").VerifiedAuthenticationResponse>;
}
