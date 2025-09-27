import { User } from './user.entity';
export declare class Session {
    id: string;
    user: User;
    tenant_id: string;
    device_id: string;
    cnf_jkt: string;
    issued_at: Date;
    not_after: Date;
    revoked_at: Date;
    version: number;
    created_at: Date;
}
