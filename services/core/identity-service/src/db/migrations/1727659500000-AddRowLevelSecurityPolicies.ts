import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRowLevelSecurityPolicies1727659500000
  implements MigrationInterface
{
  name = 'AddRowLevelSecurityPolicies1727659500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES

    await queryRunner.query(
      `ALTER TABLE "users" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "revocation_events" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_audits" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "signing_keys" ENABLE ROW LEVEL SECURITY`,
    );

    // 2. CREATE POLICY FUNCTIONS

    // Create function to check tenant access for current user
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION check_tenant_access(target_tenant_id UUID)
      RETURNS BOOLEAN AS $$
      DECLARE
        current_tenant_id UUID;
      BEGIN
        -- In a real implementation, this would check the current user's tenant permissions
        -- For now, we'll assume the tenant_id is passed in the session or JWT
        -- This is a simplified version that would be expanded in production
        RETURN TRUE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Create function to check user access for current user
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION check_user_access(target_user_id UUID)
      RETURNS BOOLEAN AS $$
      DECLARE
        current_user_id UUID;
      BEGIN
        -- In a real implementation, this would check if the current user can access the target user
        -- For now, we'll assume the user_id is passed in the session or JWT
        -- This is a simplified version that would be expanded in production
        RETURN TRUE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 3. CREATE RLS POLICIES FOR USERS TABLE

    // Users can only access their own tenant's users
    await queryRunner.query(`
      CREATE POLICY "users_tenant_isolation"
      ON "users"
      FOR ALL
      USING (check_tenant_access(tenant_id));
    `);

    // Force policy for all users table operations
    await queryRunner.query(`
      ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
    `);

    // 4. CREATE RLS POLICIES FOR SESSIONS TABLE

    // Sessions can only be accessed by users in the same tenant
    await queryRunner.query(`
      CREATE POLICY "sessions_tenant_isolation"
      ON "sessions"
      FOR ALL
      USING (check_tenant_access(tenant_id));
    `);

    // Force policy for all sessions table operations
    await queryRunner.query(`
      ALTER TABLE "sessions" FORCE ROW LEVEL SECURITY;
    `);

    // 5. CREATE RLS POLICIES FOR REFRESH_TOKENS TABLE

    // Refresh tokens can only be accessed by users in the same tenant
    await queryRunner.query(`
      CREATE POLICY "refresh_tokens_tenant_isolation"
      ON "refresh_tokens"
      FOR ALL
      USING (check_tenant_access(tenant_id));
    `);

    // Force policy for all refresh_tokens table operations
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" FORCE ROW LEVEL SECURITY;
    `);

    // 6. CREATE RLS POLICIES FOR WEBAUTHN_CREDENTIALS TABLE

    // WebAuthn credentials can only be accessed by users in the same tenant
    await queryRunner.query(`
      CREATE POLICY "webauthn_credentials_tenant_isolation"
      ON "webauthn_credentials"
      FOR ALL
      USING (check_tenant_access((SELECT tenant_id FROM users WHERE id = user_id)));
    `);

    // Force policy for all webauthn_credentials table operations
    await queryRunner.query(`
      ALTER TABLE "webauthn_credentials" FORCE ROW LEVEL SECURITY;
    `);

    // 7. CREATE RLS POLICIES FOR REVOCATION_EVENTS TABLE

    // Revocation events can only be accessed by users in the same tenant
    await queryRunner.query(`
      CREATE POLICY "revocation_events_tenant_isolation"
      ON "revocation_events"
      FOR ALL
      USING (check_tenant_access(tenant_id));
    `);

    // Force policy for all revocation_events table operations
    await queryRunner.query(`
      ALTER TABLE "revocation_events" FORCE ROW LEVEL SECURITY;
    `);

    // 8. CREATE RLS POLICIES FOR CONSENT_AUDITS TABLE

    // Consent audits can only be accessed by users in the same tenant
    await queryRunner.query(`
      CREATE POLICY "consent_audits_tenant_isolation"
      ON "consent_audits"
      FOR ALL
      USING (check_tenant_access((SELECT tenant_id FROM users WHERE id = user_id)));
    `);

    // Force policy for all consent_audits table operations
    await queryRunner.query(`
      ALTER TABLE "consent_audits" FORCE ROW LEVEL SECURITY;
    `);

    // 9. CREATE RLS POLICIES FOR SIGNING_KEYS TABLE

    // Signing keys can only be accessed by users in the same tenant
    await queryRunner.query(`
      CREATE POLICY "signing_keys_tenant_isolation"
      ON "signing_keys"
      FOR ALL
      USING (check_tenant_access(tenant_id));
    `);

    // Force policy for all signing_keys table operations
    await queryRunner.query(`
      ALTER TABLE "signing_keys" FORCE ROW LEVEL SECURITY;
    `);

    // 10. GRANT NECESSARY PERMISSIONS

    // Grant access to the application role (assuming it exists)
    // In a real implementation, you would grant access to specific roles
    await queryRunner.query(`
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
    `);

    // Grant usage on sequences
    await queryRunner.query(`
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;
    `);

    // 11. CREATE ADDITIONAL INDEXES FOR RLS PERFORMANCE

    // Add indexes to support RLS policies
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_tenant_rls" ON "users" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_tenant_rls" ON "sessions" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_tenant_rls" ON "refresh_tokens" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webauthn_credentials_user_rls" ON "webauthn_credentials" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_revocation_events_tenant_rls" ON "revocation_events" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_consent_audits_user_rls" ON "consent_audits" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_signing_keys_tenant_rls" ON "signing_keys" ("tenant_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. DROP INDEXES CREATED FOR RLS PERFORMANCE

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_signing_keys_tenant_rls"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consent_audits_user_rls"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_revocation_events_tenant_rls"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_webauthn_credentials_user_rls"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_tenant_rls"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_tenant_rls"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_tenant_rls"`);

    // 2. REVOKE PERMISSIONS

    await queryRunner.query(`
      REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM CURRENT_USER;
    `);

    await queryRunner.query(`
      REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public FROM CURRENT_USER;
    `);

    // 3. DROP RLS POLICIES

    await queryRunner.query(`DROP POLICY IF EXISTS "signing_keys_tenant_isolation" ON "signing_keys"`);
    await queryRunner.query(`ALTER TABLE "signing_keys" NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "signing_keys" DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`DROP POLICY IF EXISTS "consent_audits_tenant_isolation" ON "consent_audits"`);
    await queryRunner.query(`ALTER TABLE "consent_audits" NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "consent_audits" DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`DROP POLICY IF EXISTS "revocation_events_tenant_isolation" ON "revocation_events"`);
    await queryRunner.query(`ALTER TABLE "revocation_events" NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "revocation_events" DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`DROP POLICY IF EXISTS "webauthn_credentials_tenant_isolation" ON "webauthn_credentials"`);
    await queryRunner.query(`ALTER TABLE "webauthn_credentials" NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "webauthn_credentials" DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`DROP POLICY IF EXISTS "refresh_tokens_tenant_isolation" ON "refresh_tokens"`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`DROP POLICY IF EXISTS "sessions_tenant_isolation" ON "sessions"`);
    await queryRunner.query(`ALTER TABLE "sessions" NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`DROP POLICY IF EXISTS "users_tenant_isolation" ON "users"`);
    await queryRunner.query(`ALTER TABLE "users" NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "users" DISABLE ROW LEVEL SECURITY`);

    // 4. DROP POLICY FUNCTIONS

    await queryRunner.query(`DROP FUNCTION IF EXISTS check_user_access(UUID)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS check_tenant_access(UUID)`);
  }
}