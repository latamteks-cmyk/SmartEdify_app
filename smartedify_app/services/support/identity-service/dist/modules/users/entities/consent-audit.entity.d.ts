import { User } from './user.entity';
export declare class ConsentAudit {
    id: string;
    user: User;
    consent_type: string;
    consent_granted: boolean;
    granted_at: Date;
    ip_address: string;
    user_agent: string;
    policy_version: string;
    purpose: string;
    country_code: string;
    evidence_ref: string;
}
