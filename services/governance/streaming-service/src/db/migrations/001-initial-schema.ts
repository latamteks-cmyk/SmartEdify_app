import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1701234567890 implements MigrationInterface {
  name = 'InitialSchema1701234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create assembly_sessions table
    await queryRunner.query(`
      CREATE TABLE "assembly_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "assembly_id" uuid NOT NULL,
        "policy_id" uuid,
        "policy_version" character varying,
        "modality" character varying NOT NULL DEFAULT 'mixta',
        "status" character varying NOT NULL DEFAULT 'scheduled',
        "video_conference_link" character varying,
        "video_provider" character varying DEFAULT 'webrtc',
        "recording_url" character varying,
        "recording_hash_sha256" character varying,
        "quorum_seal" text,
        "merkle_root" character varying,
        "commit_height" bigint,
        "signing_kid" character varying,
        "started_at" TIMESTAMP WITH TIME ZONE,
        "ended_at" TIMESTAMP WITH TIME ZONE,
        "max_participants" integer DEFAULT 500,
        "current_participants" integer DEFAULT 0,
        "recording_enabled" boolean DEFAULT true,
        "transcription_enabled" boolean DEFAULT true,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assembly_sessions" PRIMARY KEY ("id")
      )
    `);

    // Create session_attendees table
    await queryRunner.query(`
      CREATE TABLE "session_attendees" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "session_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "validation_method" character varying NOT NULL,
        "validation_hash" character varying,
        "validated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "is_present" boolean DEFAULT true,
        "validation_ip" character varying,
        "validation_user_agent" character varying,
        "geolocation" jsonb,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_session_attendees" PRIMARY KEY ("id"),
        CONSTRAINT "FK_session_attendees_session" FOREIGN KEY ("session_id") REFERENCES "assembly_sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_session_attendees_tenant_session_user" UNIQUE ("tenant_id", "session_id", "user_id")
      )
    `);

    // Create speech_requests table
    await queryRunner.query(`
      CREATE TABLE "speech_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "session_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" character varying DEFAULT 'pending',
        "priority" character varying DEFAULT 'normal',
        "message" text,
        "moderator_id" uuid,
        "moderator_notes" text,
        "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "responded_at" TIMESTAMP WITH TIME ZONE,
        "speaking_started_at" TIMESTAMP WITH TIME ZONE,
        "speaking_ended_at" TIMESTAMP WITH TIME ZONE,
        "max_speaking_time" integer DEFAULT 300,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_speech_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_speech_requests_session" FOREIGN KEY ("session_id") REFERENCES "assembly_sessions"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(`CREATE INDEX "IDX_assembly_sessions_tenant_id" ON "assembly_sessions" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_assembly_sessions_tenant_assembly" ON "assembly_sessions" ("tenant_id", "assembly_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_assembly_sessions_tenant_status" ON "assembly_sessions" ("tenant_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_assembly_sessions_tenant_created" ON "assembly_sessions" ("tenant_id", "created_at")`);

    await queryRunner.query(`CREATE INDEX "IDX_session_attendees_tenant_id" ON "session_attendees" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_session_attendees_tenant_session" ON "session_attendees" ("tenant_id", "session_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_session_attendees_tenant_user" ON "session_attendees" ("tenant_id", "user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_session_attendees_tenant_validated" ON "session_attendees" ("tenant_id", "validated_at")`);

    await queryRunner.query(`CREATE INDEX "IDX_speech_requests_tenant_id" ON "speech_requests" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_speech_requests_tenant_session" ON "speech_requests" ("tenant_id", "session_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_speech_requests_tenant_user" ON "speech_requests" ("tenant_id", "user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_speech_requests_tenant_status" ON "speech_requests" ("tenant_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_speech_requests_tenant_requested" ON "speech_requests" ("tenant_id", "requested_at")`);

    // Enable Row Level Security (RLS)
    await queryRunner.query(`ALTER TABLE "assembly_sessions" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "session_attendees" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "speech_requests" ENABLE ROW LEVEL SECURITY`);

    // Create RLS policies
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_assembly_sessions" ON "assembly_sessions"
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    `);

    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_session_attendees" ON "session_attendees"
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    `);

    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_speech_requests" ON "speech_requests"
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS "tenant_isolation_speech_requests" ON "speech_requests"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "tenant_isolation_session_attendees" ON "session_attendees"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "tenant_isolation_assembly_sessions" ON "assembly_sessions"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_speech_requests_tenant_requested"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_speech_requests_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_speech_requests_tenant_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_speech_requests_tenant_session"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_speech_requests_tenant_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_session_attendees_tenant_validated"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_session_attendees_tenant_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_session_attendees_tenant_session"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_session_attendees_tenant_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assembly_sessions_tenant_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assembly_sessions_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assembly_sessions_tenant_assembly"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assembly_sessions_tenant_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "speech_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "session_attendees"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assembly_sessions"`);
  }
}