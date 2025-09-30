export declare class User {
    id: string;
    tenant_id: string;
    username: string;
    email: string;
    phone: string;
    password?: string;
    mfa_secret?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
    email_verified_at: Date | null;
    phone_verified_at: Date | null;
    preferred_login: 'PASSWORD' | 'TOTP' | 'WEBAUTHN' | null;
    created_at: Date;
    updated_at: Date;
    get isEmailVerified(): boolean;
    get isPhoneVerified(): boolean;
    get isActive(): boolean;
    get hasPassword(): boolean;
    get hasMfaEnabled(): boolean;
}
