"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTestDatabaseConfig = exports.getProductionDatabaseConfig = exports.getDatabaseConfig = void 0;
const user_entity_1 = require("../modules/users/entities/user.entity");
const webauthn_credential_entity_1 = require("../modules/webauthn/entities/webauthn-credential.entity");
const refresh_token_entity_1 = require("../modules/tokens/entities/refresh-token.entity");
const session_entity_1 = require("../modules/sessions/entities/session.entity");
const consent_audit_entity_1 = require("../modules/users/entities/consent-audit.entity");
const revocation_event_entity_1 = require("../modules/sessions/entities/revocation-event.entity");
const signing_key_entity_1 = require("../modules/keys/entities/signing-key.entity");
const dpop_replay_proof_entity_1 = require("../modules/auth/entities/dpop-replay-proof.entity");
const compliance_job_entity_1 = require("../modules/compliance/entities/compliance-job.entity");
const compliance_job_service_entity_1 = require("../modules/compliance/entities/compliance-job-service.entity");
const getDatabaseConfig = (isTest = false) => {
    const config = {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || (isTest ? '5433' : '5432')),
        username: process.env.DB_USERNAME || 'user',
        password: process.env.DB_PASSWORD || 'password',
        database: isTest
            ? process.env.DB_TEST_DATABASE || 'identity_db'
            : process.env.DB_DATABASE || 'identity_db',
        entities: [
            user_entity_1.User,
            webauthn_credential_entity_1.WebAuthnCredential,
            refresh_token_entity_1.RefreshToken,
            session_entity_1.Session,
            consent_audit_entity_1.ConsentAudit,
            revocation_event_entity_1.RevocationEvent,
            signing_key_entity_1.SigningKey,
            dpop_replay_proof_entity_1.DpopReplayProof,
            compliance_job_entity_1.ComplianceJob,
            compliance_job_service_entity_1.ComplianceJobService,
        ],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
    };
    return config;
};
exports.getDatabaseConfig = getDatabaseConfig;
const getProductionDatabaseConfig = () => ({
    ...(0, exports.getDatabaseConfig)(false),
});
exports.getProductionDatabaseConfig = getProductionDatabaseConfig;
const getTestDatabaseConfig = () => ({
    ...(0, exports.getDatabaseConfig)(true),
    synchronize: true,
    dropSchema: true,
    logging: false,
});
exports.getTestDatabaseConfig = getTestDatabaseConfig;
//# sourceMappingURL=database.config.js.map