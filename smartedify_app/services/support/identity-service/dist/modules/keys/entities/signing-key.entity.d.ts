export declare enum KeyStatus {
    ACTIVE = "ACTIVE",
    ROLLED_OVER = "ROLLED_OVER",
    EXPIRED = "EXPIRED"
}
export declare class SigningKey {
    kid: string;
    tenant_id: string;
    public_key_jwk: object;
    private_key_pem: string;
    algorithm: string;
    status: KeyStatus;
    expires_at: Date;
    created_at: Date;
    updated_at: Date;
}
