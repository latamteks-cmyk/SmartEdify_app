import { User } from '../../users/entities/user.entity';
export declare class RefreshToken {
    id: string;
    token_hash: string;
    user: User;
    jkt: string;
    kid: string;
    jti: string;
    family_id: string;
    parent_id: string;
    replaced_by_id: string;
    used_at: Date;
    client_id: string;
    device_id: string;
    session_id: string;
    scope: string;
    expires_at: Date;
    created_ip: string;
    created_ua: string;
    revoked: boolean;
    revoked_reason: string;
    created_at: Date;
}
