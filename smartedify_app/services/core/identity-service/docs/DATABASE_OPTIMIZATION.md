# Database Query Optimization Strategy

This document explains the database optimization strategy implemented for the identity-service to improve performance and scalability.

## Index Optimization

### User Table Indexes

1. **IDX_users_email**: Optimizes email-based lookups during authentication
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")
   ```

2. **IDX_users_tenant_status**: Optimizes queries filtering users by tenant and status
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_users_tenant_status" ON "users" ("tenant_id", "status")
   ```

3. **IDX_users_username**: Optimizes username-based lookups
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_users_username" ON "users" ("username")
   ```

### Session Table Indexes

1. **IDX_sessions_revoked**: Optimizes queries for revoked sessions
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_sessions_revoked" ON "sessions" ("revoked_at") WHERE "revoked_at" IS NOT NULL
   ```

2. **IDX_sessions_valid**: Optimizes queries for active sessions
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_sessions_valid" ON "sessions" ("not_after") WHERE "revoked_at" IS NULL
   ```

3. **IDX_sessions_user_active**: Optimizes queries for retrieving active sessions for a user
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_sessions_user_active" ON "sessions" ("user_id", "not_after") WHERE "revoked_at" IS NULL
   ```

### Refresh Token Table Indexes

1. **IDX_refresh_tokens_revoked**: Optimizes queries for revoked refresh tokens
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_revoked" ON "refresh_tokens" ("revoked") WHERE "revoked" = true
   ```

2. **IDX_refresh_tokens_expired**: Optimizes queries for expired refresh tokens
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_expired" ON "refresh_tokens" ("expires_at") WHERE "revoked" = false
   ```

3. **IDX_refresh_tokens_family_active**: Optimizes refresh token rotation operations
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_family_active" ON "refresh_tokens" ("family_id", "expires_at") WHERE "revoked" = false
   ```

4. **IDX_refresh_tokens_hash_active**: Optimizes refresh token lookups by hash
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_hash_active" ON "refresh_tokens" ("token_hash") WHERE "revoked" = false
   ```

### WebAuthn Credential Table Indexes

1. **IDX_webauthn_credentials_credential_id**: Optimizes credential lookups
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_webauthn_credentials_credential_id" ON "webauthn_credentials" ("credential_id")
   ```

2. **IDX_webauthn_credentials_user_active**: Optimizes queries for retrieving user credentials
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_webauthn_credentials_user_active" ON "webauthn_credentials" ("user_id", "created_at")
   ```

### Revocation Event Table Indexes

1. **IDX_revocation_events_subject_check**: Optimizes revocation event checks
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_revocation_events_subject_check" ON "revocation_events" ("subject", "tenant_id", "not_before")
   ```

2. **IDX_revocation_events_recent**: Optimizes queries for recent revocation events
   ```sql
   CREATE INDEX IF NOT EXISTS "IDX_revocation_events_recent" ON "revocation_events" ("created_at" DESC)
   ```

## Foreign Key Constraints

Added missing foreign key constraints to improve query planning and data integrity:

1. **FK_sessions_user**: Links sessions to users
   ```sql
   ALTER TABLE "sessions" ADD CONSTRAINT IF NOT EXISTS "FK_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
   ```

2. **FK_refresh_tokens_user**: Links refresh tokens to users
   ```sql
   ALTER TABLE "refresh_tokens" ADD CONSTRAINT IF NOT EXISTS "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
   ```

3. **FK_webauthn_credentials_user**: Links WebAuthn credentials to users
   ```sql
   ALTER TABLE "webauthn_credentials" ADD CONSTRAINT IF NOT EXISTS "FK_webauthn_credentials_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
   ```

## Performance Benefits

1. **Authentication Performance**: Email lookups are optimized with dedicated index
2. **Session Management**: Queries for active/revoked sessions are significantly faster
3. **Token Operations**: Refresh token lookups and rotation are optimized
4. **WebAuthn Operations**: Credential lookups and user credential retrieval are improved
5. **Revocation Checks**: Revocation event checks are optimized with composite indexes

## Monitoring Recommendations

1. Monitor index usage statistics regularly
2. Watch for slow queries in PostgreSQL logs
3. Track query execution times for critical operations
4. Monitor database connection pool usage
5. Set up alerts for high database CPU/memory usage

## Future Optimization Opportunities

1. Consider partitioning large tables by tenant_id for multi-tenant scalability
2. Implement materialized views for frequently accessed aggregated data
3. Add partial indexes for specific query patterns
4. Consider read replicas for read-heavy operations
5. Implement connection pooling optimizations