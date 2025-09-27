import { User } from './user.entity';
export declare class RefreshToken {
    id: string;
    token_hash: string;
    user: User;
    jkt: string;
    family_id: string;
    parent: RefreshToken;
    replaced_by: RefreshToken;
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
