import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1727659200000 implements MigrationInterface {
  name = 'InitialSchema1727659200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "username" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password_hash" character varying,
        "first_name" character varying,
        "last_name" character varying,
        "phone" character varying,
        "email_verified" boolean NOT NULL DEFAULT false,
        "phone_verified" boolean NOT NULL DEFAULT false,
        "mfa_enabled" boolean NOT NULL DEFAULT false,
        "mfa_secret" character varying,
        "backup_codes" text,
        "last_login" TIMESTAMP,
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" TIMESTAMP,
        "password_changed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Create unique constraints for users
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_tenant_username" ON "users" ("tenant_id", "username")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_tenant_email" ON "users" ("tenant_id", "email")
    `);

    // Create sessions table
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "device_id" character varying,
        "ip_address" character varying,
        "user_agent" character varying,
        "expires_at" TIMESTAMP NOT NULL,
        "revoked" boolean NOT NULL DEFAULT false,
        "revoked_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id")
      )
    `);

    // Create refresh_tokens table
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token_hash" character varying NOT NULL,
        "jkt" character varying,
        "kid" character varying,
        "jti" character varying,
        "family_id" character varying,
        "parent_id" uuid,
        "replaced_by_id" uuid,
        "used_at" TIMESTAMP,
        "client_id" character varying NOT NULL,
        "device_id" character varying,
        "session_id" uuid,
        "scope" character varying,
        "expires_at" TIMESTAMP NOT NULL,
        "created_ip" character varying,
        "created_ua" character varying,
        "revoked" boolean NOT NULL DEFAULT false,
        "revoked_reason" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
      )
    `);

    // Create index for refresh tokens
    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash")
    `);

    // Create consent_audits table
    await queryRunner.query(`
      CREATE TABLE "consent_audits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "action" character varying NOT NULL,
        "scope" character varying,
        "client_id" character varying,
        "ip_address" character varying,
        "user_agent" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_consent_audits" PRIMARY KEY ("id")
      )
    `);

    // Create revocation_events table
    await queryRunner.query(`
      CREATE TABLE "revocation_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "event_type" character varying NOT NULL,
        "reason" character varying,
        "ip_address" character varying,
        "user_agent" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_revocation_events" PRIMARY KEY ("id")
      )
    `);

    // Create signing_keys table
    await queryRunner.query(`
      CREATE TABLE "signing_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "kid" character varying NOT NULL,
        "algorithm" character varying NOT NULL,
        "key_type" character varying NOT NULL,
        "public_key" text NOT NULL,
        "private_key" text NOT NULL,
        "status" character varying NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP,
        "rotated_at" TIMESTAMP,
        CONSTRAINT "PK_signing_keys" PRIMARY KEY ("id")
      )
    `);

    // Create index for signing keys
    await queryRunner.query(`
      CREATE INDEX "IDX_signing_keys_tenant_status" ON "signing_keys" ("tenant_id", "status")
    `);

    // Create webauthn_credentials table
    await queryRunner.query(`
      CREATE TABLE "webauthn_credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "credential_id" character varying NOT NULL,
        "public_key" text NOT NULL,
        "counter" bigint NOT NULL DEFAULT 0,
        "device_type" character varying,
        "backed_up" boolean NOT NULL DEFAULT false,
        "transports" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_used" TIMESTAMP,
        CONSTRAINT "PK_webauthn_credentials" PRIMARY KEY ("id")
      )
    `);

    // Create unique constraint for webauthn credentials
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_webauthn_credentials_user_credential" ON "webauthn_credentials" ("user_id", "credential_id")
    `);

    // Create dpop_replay_proofs table
    await queryRunner.query(`
      CREATE TABLE "dpop_replay_proofs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "jkt" character varying NOT NULL,
        "jti" character varying NOT NULL,
        "iat" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dpop_replay_proofs" PRIMARY KEY ("id")
      )
    `);

    // Create unique index for dpop replay proofs
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_dpop_replay_proofs_tenant_jkt_jti" ON "dpop_replay_proofs" ("tenant_id", "jkt", "jti")
    `);

    // Create compliance_jobs table
    await queryRunner.query(`
      CREATE TABLE "compliance_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "job_id" character varying NOT NULL,
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "job_type" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "requested_by" character varying,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP,
        CONSTRAINT "PK_compliance_jobs" PRIMARY KEY ("id")
      )
    `);

    // Create compliance_job_services table
    await queryRunner.query(`
      CREATE TABLE "compliance_job_services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "job_id" uuid NOT NULL,
        "service_name" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "response_data" jsonb,
        "error_message" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP,
        CONSTRAINT "PK_compliance_job_services" PRIMARY KEY ("id")
      )
    `);

    // Create unique constraint for compliance job services
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_compliance_job_services_job_service" ON "compliance_job_services" ("job_id", "service_name")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_session" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "consent_audits" ADD CONSTRAINT "FK_consent_audits_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "revocation_events" ADD CONSTRAINT "FK_revocation_events_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "FK_webauthn_credentials_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "compliance_jobs" ADD CONSTRAINT "FK_compliance_jobs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "compliance_job_services" ADD CONSTRAINT "FK_compliance_job_services_job" FOREIGN KEY ("job_id") REFERENCES "compliance_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(
      `ALTER TABLE "compliance_job_services" DROP CONSTRAINT "FK_compliance_job_services_job"`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_jobs" DROP CONSTRAINT "FK_compliance_jobs_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" DROP CONSTRAINT "FK_webauthn_credentials_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "revocation_events" DROP CONSTRAINT "FK_revocation_events_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_audits" DROP CONSTRAINT "FK_consent_audits_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_session"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_user"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "compliance_job_services"`);
    await queryRunner.query(`DROP TABLE "compliance_jobs"`);
    await queryRunner.query(`DROP TABLE "dpop_replay_proofs"`);
    await queryRunner.query(`DROP TABLE "webauthn_credentials"`);
    await queryRunner.query(`DROP TABLE "signing_keys"`);
    await queryRunner.query(`DROP TABLE "revocation_events"`);
    await queryRunner.query(`DROP TABLE "consent_audits"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
