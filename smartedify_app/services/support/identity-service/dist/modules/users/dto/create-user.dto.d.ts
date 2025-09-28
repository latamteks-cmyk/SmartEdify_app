export declare class CreateUserDto {
    tenant_id: string;
    username: string;
    email: string;
    phone?: string;
    password?: string;
    consent_granted: boolean;
    policy_version?: string;
}
