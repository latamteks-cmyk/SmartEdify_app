# Identity Service - Task Plan for Audit and Testing Implementation

## Document Information
- **Service:** identity-service
- **Port:** 3001
- **Version:** 3.3
- **Created Date:** 2025-10-02
- **Status:** Initial Analysis Complete

## 1. Current State of the Project

### 1.1. Architecture Overview
The identity-service follows a NestJS modular architecture with the following key components:
- **Modules:** auth, authorization, sessions, tokens, webauthn, users, keys, compliance, qrcodes, mfa, oidc-discovery, privacy
- **Database:** PostgreSQL with TypeORM
- **Security:** DPoP, WebAuthn L3, OAuth 2.0 BCP, JWT with ES256
- **Multi-tenancy:** RLS (Row Level Security) with tenant_id isolation

### 1.2. Current Implementation Status
The codebase is largely aligned with specification v3.3 but has some gaps:
- ✅ Core functionality implemented (WebAuthn, refresh token rotation, DPoP)
- ✅ JWT signing with ES256 and key rotation
- ✅ Session management with not_before checks
- ❌ Low test coverage (~30% vs required 80%)
- ❌ Some console.log statements in production code
- ❌ Incomplete implementations in auth.service (device code flow)

### 1.3. Database Schema Status
- ✅ Migrations align with specification v3.3
- ✅ Proper indexing for performance
- ✅ Check constraints for data integrity
- ✅ Multi-tenant isolation with tenant_id

## 2. Identified Improvements

### 2.1. Code Quality Issues
1. **Console.log statements in production code** - Need to be replaced with proper logging
2. **Incomplete endpoint implementations** - Device code flow not fully implemented
3. **Missing error handling** - Some validation and error responses need improvements
4. **Dependency injection issues** - Some test files have dependency injection problems

### 2.2. Security Enhancements
1. **DPoP validation** - Need enhanced validation and replay protection
2. **Refresh token reuse detection** - Already implemented but needs thorough testing
3. **Rate limiting** - Currently missing, needs implementation
4. **Session management** - Need additional checks and validation

### 2.3. Specification Compliance
1. **RFC 7807 error format** - Need to implement proper problem details format
2. **PKCE enforcement** - Need to ensure PKCE is mandatory for authorization code
3. **Introspection security** - Need to ensure `/oauth/introspect` requires client auth
4. **WebSocket PoP** - Not implemented yet

## 3. Database Analysis

### 3.1. Schema Review
The database schema is well-designed with:
- Users table with tenant isolation
- Refresh tokens with family tracking and rotation
- Sessions with DPoP binding and versioning
- WebAuthn credentials with all required fields
- Revocation events for global logout

### 3.2. Identified Issues
1. **Missing RLS policies** - Need to ensure all tables have proper RLS
2. **Index optimization** - Some queries may benefit from additional indexes
3. **Tenant validation** - Need to ensure tenant_id validation in all operations

## 4. Test Coverage Requirements (Minimum 80%)

### 4.1. Current Coverage Status
- **Current Statement Coverage:** ~30.53%
- **Required Statement Coverage:** 80%
- **Current Branch Coverage:** ~31.2%
- **Required Branch Coverage:** 80%
- **Current Function Coverage:** ~21.07%
- **Required Function Coverage:** 80%
- **Current Line Coverage:** ~30.03%
- **Required Line Coverage:** 80%

### 4.2. PostgreSQL and Seed Data Requirements
- **Test Database:** PostgreSQL (same as production)
- **Seed Data:** 5 example records per major entity
- **Test Scenarios:** Complete coverage of authentication flows

#### 4.2.1. Example Seed Data
```
Users (5):
- user1@example.com (tenant: tenant-a)
- user2@example.com (tenant: tenant-b) 
- user3@example.com (tenant: tenant-c)
- user4@example.com (tenant: tenant-a)
- user5@example.com (tenant: tenant-b)

WebAuthn Credentials (5):
- credential1 for user1
- credential2 for user2
- credential3 for user3
- credential4 for user4
- credential5 for user5

Sessions (5):
- session1 for user1
- session2 for user2
- session3 for user3
- session4 for user4
- session5 for user5

Refresh Tokens (5):
- token1 for user1
- token2 for user2
- token3 for user3
- token4 for user4
- token5 for user5

Revocation Events (5):
- logout_event1 for user1
- logout_event2 for user2
- logout_event3 for user3
- logout_event4 for user4
- logout_event5 for user5
```

## 5. Atomic Tasks for Test Implementation

### 5.1. Unit Tests (Individual Components)

#### 5.1.1. Users Module
- [x] `test/unit/modules/users/users.service.spec.ts`: UsersService: findById method
- [x] `test/unit/modules/users/users.service.spec.ts`: UsersService: create method
- [ ] `test/unit/modules/users/users.service.spec.ts`: UsersService: update methods
- [ ] `test/unit/modules/users/users.service.spec.ts`: UsersService: validation logic
- [ ] `test/unit/modules/users/user.entity.spec.ts`: User entity methods
- [ ] `test/unit/modules/users/user.entity.spec.ts`: User entity validation

#### 5.1.2. Auth Module
- [ ] `test/unit/modules/auth/auth.service.spec.ts`: AuthService: generateAuthorizationCode method
- [x] `test/unit/modules/auth/auth.service.spec.ts`: AuthService: exchangeCodeForTokens method
- [x] `test/unit/modules/auth/auth.service.spec.ts`: AuthService: validateDpopProof method
- [x] `test/unit/modules/auth/auth.service.spec.ts`: AuthService: refreshTokens method
- [ ] `test/unit/modules/auth/auth.service.spec.ts`: AuthService: introspect method
- [ ] `test/unit/modules/auth/auth.service.spec.ts`: AuthService: handleBackchannelLogout method
- [ ] `test/unit/modules/auth/store/authorization-code-store.service.spec.ts`: AuthorizationCodeStoreService
- [ ] `test/unit/modules/auth/store/device-code-store.service.spec.ts`: DeviceCodeStoreService
- [ ] `test/unit/modules/auth/store/par-store.service.spec.ts`: ParStoreService
- [ ] `test/unit/modules/auth/store/jti-store.service.spec.ts`: JtiStoreService
 - [x] `test/unit/modules/auth/store/authorization-code-store.service.spec.ts`: AuthorizationCodeStoreService
 - [x] `test/unit/modules/auth/store/device-code-store.service.spec.ts`: DeviceCodeStoreService
 - [x] `test/unit/modules/auth/store/par-store.service.spec.ts`: ParStoreService
 - [x] `test/unit/modules/auth/store/jti-store.service.spec.ts`: JtiStoreService

#### 5.1.3. Tokens Module
- [x] `test/unit/modules/tokens/tokens.service.spec.ts`: TokensService: issueRefreshToken method
- [x] `test/unit/modules/tokens/tokens.service.spec.ts`: TokensService: validateRefreshToken method
- [x] `test/unit/modules/tokens/tokens.service.spec.ts`: TokensService: rotateRefreshToken method
- [x] `test/unit/modules/tokens/tokens.service.spec.ts`: TokensService: validateAccessToken method
- [ ] `test/unit/modules/tokens/tokens.service.spec.ts`: TokensService: validateRefreshTokenWithNotBefore method
- [x] `test/unit/modules/tokens/tokens.service.spec.ts`: TokensService: revokeTokenFamily method
- [ ] `test/unit/modules/tokens/entities/refresh-token.entity.spec.ts`: RefreshToken entity methods

#### 5.1.4. Sessions Module
- [x] `test/unit/modules/sessions/sessions.service.spec.ts`: SessionsService: getActiveSessions method
- [x] `test/unit/modules/sessions/sessions.service.spec.ts`: SessionsService: revokeUserSessions method
- [x] `test/unit/modules/sessions/sessions.service.spec.ts`: SessionsService: getNotBeforeTime method
- [ ] `test/unit/modules/sessions/entities/session.entity.spec.ts`: Session entity methods
- [ ] `test/unit/modules/sessions/entities/revocation-event.entity.spec.ts`: RevocationEvent entity methods

#### 5.1.5. WebAuthn Module
- [x] `test/unit/modules/webauthn/webauthn.service.spec.ts`: WebauthnService: registration process
- [x] `test/unit/modules/webauthn/webauthn.service.spec.ts`: WebauthnService: authentication process
- [x] `test/unit/modules/webauthn/webauthn.service.spec.ts`: WebauthnService: credential persistence
- [ ] `test/unit/modules/webauthn/rp.service.spec.ts`: RpService: RP configuration
- [ ] `test/unit/modules/webauthn/entities/webauthn-credential.entity.spec.ts`: WebAuthnCredential entity methods

#### 5.1.6. Keys Module  
- [x] `test/unit/modules/keys/key-management.service.spec.ts`: KeyManagementService: generateNewKey method
- [x] `test/unit/modules/keys/key-management.service.spec.ts`: KeyManagementService: getActiveSigningKey method
- [x] `test/unit/modules/keys/key-management.service.spec.ts`: KeyManagementService: getJwksForTenant method
- [ ] `test/unit/modules/keys/key-rotation.service.spec.ts`: KeyRotationService: handleCron method
- [ ] `test/unit/modules/keys/entities/signing-key.entity.spec.ts`: SigningKey entity methods

#### 5.1.7. OIDC Discovery Module
- [x] `test/unit/modules/oidc-discovery/oidc-discovery.service.spec.ts`: OidcDiscoveryService: getOidcConfiguration method
- [x] `test/unit/modules/oidc-discovery/oidc-discovery.service.spec.ts`: OidcDiscoveryService: getJwksByTenant method
- [x] `test/unit/modules/oidc-discovery/oidc-discovery.service.spec.ts`: Tenant validation logic

#### 5.1.8. Compliance Module
- [x] `test/unit/modules/compliance/compliance.service.spec.ts`: ComplianceService: DSAR operations
- [x] `test/unit/modules/compliance/compliance.service.spec.ts`: ComplianceService: incident reporting
- [ ] `test/unit/modules/compliance/entities/compliance-job.entity.spec.ts`: ComplianceJob entity methods

#### 5.1.9. MFA Module
- [ ] `test/unit/modules/mfa/mfa.service.spec.ts`: MFA service methods

#### 5.1.10. Privacy Module
- [ ] `test/unit/modules/privacy/privacy.service.spec.ts`: Privacy service operations

### 5.2. Integration Tests (Module-to-Module)

#### 5.2.1. Authentication Flow Tests
- [x] Authorization code flow with PKCE
- [x] Token exchange with DPoP
- [x] Refresh token rotation
- [x] Token reuse detection
- [x] DPoP anti-replay protection

#### 5.2.2. Multi-tenant Isolation Tests
- [x] Cross-tenant data isolation
- [x] Tenant-specific JWKS
- [x] Tenant-specific OIDC configuration

#### 5.2.3. Security Tests
- [x] Session revocation
- [x] Global logout
- [x] Token introspection
- [x] Back-channel logout
- [x] Device authorization flow

#### 5.2.4. WebAuthn Integration Tests
- [x] Registration flow
- [x] Authentication flow
- [x] Credential management

### 5.3. End-to-End Tests (Complete User Flows)

#### 5.3.1. Complete Authentication Scenarios
- [x] WebAuthn registration and authentication
- [ ] Password + TOTP MFA flow
- [x] Refresh token rotation
- [x] Global logout

#### 5.3.2. Security Scenario Tests
- [x] Refresh token reuse detection
- [x] DPoP proof replay prevention
- [x] Invalid token handling
- [x] Rate limiting (when implemented)

### 5.4. Mock-Based Endpoint Testing

#### 5.4.1. External Service Mocks
- [x] Tenancy service for tenant validation
- [ ] Compliance service for DSAR flows
- [x] Kafka for event publishing
- [x] HTTP client for external API calls

#### 5.4.2. Repository Mocks
- [x] UserRepository mock
- [x] RefreshTokenRepository mock
- [x] SessionRepository mock
- [x] WebAuthnCredentialRepository mock
- [x] SigningKeyRepository mock

#### 5.4.3. Endpoint Tests for All APIs
- [x] OIDC Discovery endpoints (`/.well-known/openid-configuration`, `/.well-known/jwks.json`)
- [x] Authorization endpoint (`/authorize`)
- [x] Token endpoint (`/oauth/token`)
- [x] Introspection endpoint (`/oauth/introspect`)
- [x] Revocation endpoint (`/oauth/revoke`)
- [x] Device authorization endpoint (`/oauth/device_authorization`)
- [x] PAR endpoint (`/oauth/par`)
- [x] Logout endpoints (`/logout`, `/backchannel-logout`)
- [x] WebAuthn endpoints (`/webauthn/*`)
- [ ] Session management endpoints (`/identity/v2/sessions/*`)
- [ ] Refresh token management (`/identity/v2/token/refresh`)
- [ ] QR contextual token endpoints (`/identity/v2/contextual-tokens/*`)
 - [x] Session management endpoints (`/identity/v2/sessions/*`)
 - [ ] Refresh token management (`/identity/v2/token/refresh`)
 - [x] QR contextual token endpoints (`/identity/v2/contextual-tokens/*`)
- [x] Privacy endpoints (`/privacy/*`)

## 6. Implementation Plan

### Phase 1: Fix Critical Issues (Week 1)
- [x] Remove console.log statements from production code
- [x] Fix failing tests in WebAuthn module
- [x] Complete device code flow implementation
- [ ] Add proper error handling and logging

### Phase 2: Implement Missing Tests (Week 2-3)
- [x] Write unit tests for all services
- [x] Create PostgreSQL seed data
- [x] Implement integration tests
- [x] Implement E2E tests

### Phase 3: Security and Compliance (Week 4)
- [x] Add RFC 7807 error format
- [x] Implement PKCE enforcement
- [x] Enhance introspection security
- [x] Add rate limiting

### Phase 4: Performance and Optimization (Week 5)
- [x] Optimize database queries with proper indexing
- [x] Add RLS policies for all entities
- [x] Performance testing for high-load scenarios
- [ ] Final coverage verification (ensure 80%+ across all metrics)

## 7. Testing Strategy

### 7.1. Mock Strategy
- Mock external services (tenancy, compliance, Kafka)
- Mock cryptographic operations for performance
- Mock HTTP requests
- Use in-memory database for unit tests

### 7.2. Coverage Strategy
- Use Jest coverage thresholds to enforce 80% minimum
- Focus on critical security paths first
- Ensure all error handling paths are tested
- Test both positive and negative scenarios

### 7.3. Data Strategy
- Use PostgreSQL for all integration and E2E tests
- Prepare seed data for 5 example users across different tenants
- Ensure test data isolation between test runs
- Implement proper cleanup after tests

## 8. Success Criteria

### 80% Coverage Requirements:
- [ ] Statement coverage: 80% minimum
- [ ] Branch coverage: 80% minimum  
- [ ] Function coverage: 80% minimum
- [ ] Line coverage: 80% minimum

### Security Requirements:
- [x] DPoP validation thoroughly tested
- [x] Refresh token reuse detection tested
- [x] Global logout propagation tested
- [x] Tenant isolation verified

### Performance Requirements:
- [ ] API endpoints respond within 500ms average
- [ ] JWT validation under 100ms
- [ ] Session validation under 50ms

This task plan provides a comprehensive roadmap to bring the identity-service to specification compliance with 80%+ test coverage using PostgreSQL and proper mocking strategies.
