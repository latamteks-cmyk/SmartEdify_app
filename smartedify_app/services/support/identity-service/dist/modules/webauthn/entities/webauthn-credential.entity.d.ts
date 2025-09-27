import { User } from '../../users/entities/user.entity';
export declare class WebAuthnCredential {
    id: string;
    user: User;
    credential_id: Buffer;
    public_key: Buffer;
    sign_count: number;
    rp_id: string;
    origin: string;
    aaguid: Buffer;
    attestation_fmt: string;
    transports: string[];
    backup_eligible: boolean;
    backup_state: string;
    cred_protect: string;
    last_used_at: Date;
    created_at: Date;
}
