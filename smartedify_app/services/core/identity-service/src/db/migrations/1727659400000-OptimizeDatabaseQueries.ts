import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeDatabaseQueries1727659400000
  implements MigrationInterface
{
  name = 'OptimizeDatabaseQueries1727659400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. OPTIMIZE USER QUERIES
    
    // Add index for email lookups (common authentication operation)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")`,
    );
    
    // Add composite index for tenant_id and status (for filtering active users in a tenant)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_tenant_status" ON "users" ("tenant_id", "status")`,
    );
    
    // Add index for username lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_username" ON "users" ("username")`,
    );

    // 2. OPTIMIZE SESSION QUERIES
    
    // Add index for session revocation checks
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_revoked" ON "sessions" ("revoked_at") WHERE "revoked_at" IS NOT NULL`,
    );
    
    // Add index for session validity checks (active sessions)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_valid" ON "sessions" ("not_after") WHERE "revoked_at" IS NULL`,
    );
    
    // Add composite index for user sessions (getting all sessions for a user)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_user_active" ON "sessions" ("user_id", "not_after") WHERE "revoked_at" IS NULL`,
    );

    // 3. OPTIMIZE REFRESH TOKEN QUERIES
    
    // Add index for refresh token revocation checks
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_revoked" ON "refresh_tokens" ("revoked") WHERE "revoked" = true`,
    );
    
    // Add index for refresh token expiration checks
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_expired" ON "refresh_tokens" ("expires_at") WHERE "revoked" = false`,
    );
    
    // Add composite index for family-based operations (refresh token rotation)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_family_active" ON "refresh_tokens" ("family_id", "expires_at") WHERE "revoked" = false`,
    );
    
    // Add index for token lookups by hash
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_hash_active" ON "refresh_tokens" ("token_hash") WHERE "revoked" = false`,
    );

    // 4. OPTIMIZE WEBAUTHN CREDENTIAL QUERIES
    
    // Add index for credential lookups by credential_id
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webauthn_credentials_credential_id" ON "webauthn_credentials" ("credential_id")`,
    );
    
    // Add composite index for user credentials (getting all credentials for a user)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webauthn_credentials_user_active" ON "webauthn_credentials" ("user_id", "created_at")`,
    );

    // 5. OPTIMIZE REVOCATION EVENT QUERIES
    
    // Add composite index for checking revocation events by subject and tenant
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_revocation_events_subject_check" ON "revocation_events" ("subject", "tenant_id", "not_before")`,
    );
    
    // Add index for recent revocation events
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_revocation_events_recent" ON "revocation_events" ("created_at" DESC)`,
    );

    // 6. ADD MISSING FOREIGN KEY CONSTRAINTS FOR BETTER QUERY PLANNING
    
    // Add FK constraint for sessions.user_id
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT IF NOT EXISTS "FK_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    
    // Add FK constraint for refresh_tokens.user_id
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT IF NOT EXISTS "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    
    // Add FK constraint for webauthn_credentials.user_id
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ADD CONSTRAINT IF NOT EXISTS "FK_webauthn_credentials_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" DROP CONSTRAINT IF EXISTS "FK_webauthn_credentials_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "FK_refresh_tokens_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "FK_sessions_user"`,
    );

    // Remove indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_revocation_events_recent"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_revocation_events_subject_check"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_webauthn_credentials_user_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_webauthn_credentials_credential_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_hash_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_family_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_expired"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_revoked"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_user_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_valid"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_revoked"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_username"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
  }
}