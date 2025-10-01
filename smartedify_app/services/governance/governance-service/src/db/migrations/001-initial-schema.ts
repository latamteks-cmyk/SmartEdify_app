import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1701234567890 implements MigrationInterface {
  name = 'InitialSchema1701234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create assemblies table
    await queryRunner.query(`
      CREATE TABLE "assemblies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" character varying NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "type" character varying NOT NULL DEFAULT 'general',
        "status" character varying NOT NULL DEFAULT 'draft',
        "start_date" TIMESTAMP NOT NULL,
        "end_date" TIMESTAMP NOT NULL,
        "location" character varying,
        "virtual_url" character varying,
        "max_participants" integer,
        "quorum_percentage" numeric(5,2) DEFAULT 50.00,
        "default_voting_type" character varying DEFAULT 'simple_majority',
        "agenda" json,
        "metadata" json,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assemblies" PRIMARY KEY ("id")
      )
    `);

    // Create sessions table
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" character varying NOT NULL,
        "assembly_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "type" character varying NOT NULL DEFAULT 'discussion',
        "status" character varying NOT NULL DEFAULT 'scheduled',
        "start_time" TIMESTAMP NOT NULL,
        "end_time" TIMESTAMP NOT NULL,
        "duration_minutes" integer,
        "agenda" json,
        "moderator_id" character varying,
        "notes" text,
        "recording_url" character varying,
        "metadata" json,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sessions_assembly" FOREIGN KEY ("assembly_id") REFERENCES "assemblies"("id") ON DELETE CASCADE
      )
    `);

    // Create votes table
    await queryRunner.query(`
      CREATE TABLE "votes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" character varying NOT NULL,
        "assembly_id" uuid NOT NULL,
        "session_id" uuid,
        "title" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "voting_type" character varying NOT NULL DEFAULT 'simple_majority',
        "status" character varying NOT NULL DEFAULT 'draft',
        "start_time" TIMESTAMP NOT NULL,
        "end_time" TIMESTAMP NOT NULL,
        "options" json NOT NULL,
        "results" json DEFAULT '{}',
        "total_votes" integer DEFAULT 0,
        "required_quorum" numeric(5,2) DEFAULT 50.00,
        "required_majority" numeric(5,2) DEFAULT 50.00,
        "result" character varying DEFAULT 'pending',
        "created_by" character varying NOT NULL,
        "is_anonymous" boolean DEFAULT false,
        "allow_changes" boolean DEFAULT false,
        "metadata" json,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_votes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_votes_assembly" FOREIGN KEY ("assembly_id") REFERENCES "assemblies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_votes_session" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_votes_tenant_assembly_title" UNIQUE ("tenant_id", "assembly_id", "title")
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(`CREATE INDEX "IDX_assemblies_tenant_id" ON "assemblies" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_assemblies_tenant_status" ON "assemblies" ("tenant_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_assemblies_tenant_type" ON "assemblies" ("tenant_id", "type")`);
    await queryRunner.query(`CREATE INDEX "IDX_assemblies_tenant_start_date" ON "assemblies" ("tenant_id", "start_date")`);

    await queryRunner.query(`CREATE INDEX "IDX_sessions_tenant_id" ON "sessions" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_sessions_tenant_assembly" ON "sessions" ("tenant_id", "assembly_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_sessions_tenant_status" ON "sessions" ("tenant_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_sessions_tenant_start_time" ON "sessions" ("tenant_id", "start_time")`);

    await queryRunner.query(`CREATE INDEX "IDX_votes_tenant_id" ON "votes" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_votes_tenant_assembly" ON "votes" ("tenant_id", "assembly_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_votes_tenant_session" ON "votes" ("tenant_id", "session_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_votes_tenant_status" ON "votes" ("tenant_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_votes_tenant_start_time" ON "votes" ("tenant_id", "start_time")`);

    // Enable Row Level Security (RLS)
    await queryRunner.query(`ALTER TABLE "assemblies" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "votes" ENABLE ROW LEVEL SECURITY`);

    // Create RLS policies (these would be customized based on your auth system)
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_assemblies" ON "assemblies"
      USING (tenant_id = current_setting('app.current_tenant_id', true))
    `);

    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_sessions" ON "sessions"
      USING (tenant_id = current_setting('app.current_tenant_id', true))
    `);

    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_votes" ON "votes"
      USING (tenant_id = current_setting('app.current_tenant_id', true))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS "tenant_isolation_votes" ON "votes"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "tenant_isolation_sessions" ON "sessions"`);
    await queryRunner.query(`DROP POLICY IF EXISTS "tenant_isolation_assemblies" ON "assemblies"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_votes_tenant_start_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_votes_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_votes_tenant_session"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_votes_tenant_assembly"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_votes_tenant_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_tenant_start_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_tenant_assembly"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_tenant_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assemblies_tenant_start_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assemblies_tenant_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assemblies_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assemblies_tenant_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "votes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assemblies"`);
  }
}