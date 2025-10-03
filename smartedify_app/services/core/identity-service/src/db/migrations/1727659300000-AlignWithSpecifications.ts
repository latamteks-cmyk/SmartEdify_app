import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignWithSpecifications1727659300000
  implements MigrationInterface
{
  name = 'AlignWithSpecifications1727659300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. CORREGIR TABLA USERS - Alinear con identity-service.md v3.3

    // Eliminar campos que van a user-profiles-service
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "first_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "last_name"`,
    );

    // Renombrar campos para consistencia con especificación
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "email_verified" TO "email_verified_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email_verified_at" TYPE TIMESTAMPTZ USING CASE WHEN "email_verified_at"::boolean THEN NOW() ELSE NULL END`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "phone_verified" TO "phone_verified_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "phone_verified_at" TYPE TIMESTAMPTZ USING CASE WHEN "phone_verified_at"::boolean THEN NOW() ELSE NULL END`,
    );

    // Agregar campos requeridos por especificación v3.3
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_login" TEXT`,
    );

    // Eliminar campos obsoletos de autenticación básica
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "backup_codes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "failed_login_attempts"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "locked_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "password_changed_at"`,
    );

    // Renombrar password_hash a password para consistencia
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "password_hash" TO "password"`,
    );

    // 2. CORREGIR TABLA SESSIONS - Alinear con especificación v3.3

    // Agregar campos requeridos para DPoP y revocación global
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "tenant_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "cnf_jkt" TEXT NOT NULL DEFAULT 'temp'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "issued_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "not_after" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "version" INT NOT NULL DEFAULT 1`,
    );

    // Eliminar campos obsoletos
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "ip_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "user_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "revoked"`,
    );

    // Renombrar revoked_at para consistencia
    await queryRunner.query(
      `ALTER TABLE "sessions" RENAME COLUMN "revoked_at" TO "revoked_at"`,
    );

    // 3. CORREGIR TABLA REFRESH_TOKENS - Implementar reuse detection

    // Agregar campos para reuse detection según especificación
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "family_id" UUID NOT NULL DEFAULT gen_random_uuid()`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "tenant_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );

    // Asegurar que campos requeridos existen
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "jkt" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "device_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "session_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "scope" SET NOT NULL`,
    );

    // 4. CORREGIR TABLA CONSENT_AUDITS - Alinear con especificación

    // Agregar campos requeridos por especificación v3.3
    await queryRunner.query(
      `ALTER TABLE "consent_audits" ADD COLUMN IF NOT EXISTS "consent_type" TEXT NOT NULL DEFAULT 'terms_of_service'`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_audits" ADD COLUMN IF NOT EXISTS "consent_granted" BOOLEAN NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_audits" ADD COLUMN IF NOT EXISTS "granted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_audits" ADD COLUMN IF NOT EXISTS "policy_version" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_audits" ADD COLUMN IF NOT EXISTS "purpose" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_audits" ADD COLUMN IF NOT EXISTS "country_code" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_audits" ADD COLUMN IF NOT EXISTS "evidence_ref" TEXT`,
    );

    // Eliminar campos obsoletos
    await queryRunner.query(
      `ALTER TABLE "consent_audits" DROP COLUMN IF EXISTS "action"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_audits" DROP COLUMN IF EXISTS "scope"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consent_audits" DROP COLUMN IF EXISTS "client_id"`,
    );

    // 5. CORREGIR TABLA REVOCATION_EVENTS - Alinear con especificación

    // Renombrar y agregar campos según especificación v3.3
    await queryRunner.query(
      `ALTER TABLE "revocation_events" RENAME COLUMN "event_type" TO "type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "revocation_events" RENAME COLUMN "user_id" TO "subject"`,
    );
    await queryRunner.query(
      `ALTER TABLE "revocation_events" ADD COLUMN IF NOT EXISTS "tenant_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "revocation_events" ADD COLUMN IF NOT EXISTS "session_id" UUID`,
    );
    await queryRunner.query(
      `ALTER TABLE "revocation_events" ADD COLUMN IF NOT EXISTS "jti" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "revocation_events" ADD COLUMN IF NOT EXISTS "not_before" TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    );

    // Eliminar campos obsoletos
    await queryRunner.query(
      `ALTER TABLE "revocation_events" DROP COLUMN IF EXISTS "reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "revocation_events" DROP COLUMN IF EXISTS "ip_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "revocation_events" DROP COLUMN IF EXISTS "user_agent"`,
    );

    // 6. CORREGIR TABLA WEBAUTHN_CREDENTIALS - Alinear con especificación WebAuthn L3

    // Renombrar campos para consistencia
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" RENAME COLUMN "counter" TO "sign_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" RENAME COLUMN "last_used" TO "last_used_at"`,
    );

    // Agregar campos requeridos por WebAuthn L3
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ADD COLUMN IF NOT EXISTS "rp_id" TEXT NOT NULL DEFAULT 'smartedify.global'`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ADD COLUMN IF NOT EXISTS "origin" TEXT NOT NULL DEFAULT 'https://app.smartedify.global'`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ADD COLUMN IF NOT EXISTS "aaguid" BYTEA`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ADD COLUMN IF NOT EXISTS "attestation_fmt" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ADD COLUMN IF NOT EXISTS "backup_eligible" BOOLEAN`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ADD COLUMN IF NOT EXISTS "backup_state" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ADD COLUMN IF NOT EXISTS "cred_protect" TEXT`,
    );

    // Eliminar campos obsoletos
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" DROP COLUMN IF EXISTS "device_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" DROP COLUMN IF EXISTS "backed_up"`,
    );

    // 7. CREAR ÍNDICES PARA PERFORMANCE

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_user_tenant" ON "sessions" ("user_id", "tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_device" ON "sessions" ("device_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_revocation_events_subject" ON "revocation_events" ("subject", "tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_revocation_events_not_before" ON "revocation_events" ("not_before")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_family" ON "refresh_tokens" ("family_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_tenant" ON "refresh_tokens" ("tenant_id")`,
    );

    // 8. CREAR CONSTRAINTS DE VALIDACIÓN

    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT IF NOT EXISTS "CHK_users_status" CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'LOCKED'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT IF NOT EXISTS "CHK_users_preferred_login" CHECK ("preferred_login" IN ('PASSWORD', 'TOTP', 'WEBAUTHN'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "revocation_events" ADD CONSTRAINT IF NOT EXISTS "CHK_revocation_events_type" CHECK ("type" IN ('SESSION', 'TOKEN', 'SUBJECT'))`,
    );

    // 9. ACTUALIZAR FOREIGN KEYS

    // Agregar FK para tenant_id en sessions (requiere que tenancy-service esté disponible)
    // await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."tenants"("id")`);

    // Agregar FK para refresh_tokens family tracking
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT IF NOT EXISTS "FK_refresh_tokens_parent" FOREIGN KEY ("parent_id") REFERENCES "refresh_tokens"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT IF NOT EXISTS "FK_refresh_tokens_replaced_by" FOREIGN KEY ("replaced_by_id") REFERENCES "refresh_tokens"("id")`,
    );

    // 10. LIMPIAR DATOS TEMPORALES

    // Actualizar tenant_id temporal con valores reales (esto debe hacerse manualmente en producción)
    // await queryRunner.query(`UPDATE "users" SET "tenant_id" = '...' WHERE "tenant_id" = '00000000-0000-0000-0000-000000000000'`);
    // await queryRunner.query(`UPDATE "sessions" SET "tenant_id" = '...' WHERE "tenant_id" = '00000000-0000-0000-0000-000000000000'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback en orden inverso

    // Eliminar constraints
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "CHK_users_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "CHK_users_preferred_login"`,
    );
    await queryRunner.query(
      `ALTER TABLE "revocation_events" DROP CONSTRAINT IF EXISTS "CHK_revocation_events_type"`,
    );

    // Eliminar foreign keys
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "FK_refresh_tokens_parent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "FK_refresh_tokens_replaced_by"`,
    );

    // Eliminar índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_user_tenant"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_device"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_revocation_events_subject"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_revocation_events_not_before"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_family"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_tenant"`);

    // Restaurar campos eliminados (esto es complejo y puede requerir intervención manual)
    // console.log(
    //   'WARNING: Rollback may require manual intervention to restore deleted columns and data',
    // );
  }
}
