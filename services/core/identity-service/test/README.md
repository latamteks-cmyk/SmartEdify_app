# Identity Service - Test Directory Structure

This document describes the organized test directory structure for the identity-service.

## Directory Structure

```
test/
├── unit/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.spec.ts
│   │   │   ├── store/
│   │   │   │   ├── authorization-code-store.service.spec.ts
│   │   │   │   ├── device-code-store.service.spec.ts
│   │   │   │   ├── par-store.service.spec.ts
│   │   │   │   └── jti-store.service.spec.ts
│   │   │   └── guards/
│   │   │       ├── client-auth.guard.spec.ts
│   │   │       └── dpop.guard.spec.ts
│   │   ├── tokens/
│   │   │   ├── tokens.service.spec.ts
│   │   │   └── entities/
│   │   │       └── refresh-token.entity.spec.ts
│   │   ├── sessions/
│   │   │   ├── sessions.service.spec.ts
│   │   │   └── entities/
│   │   │       ├── session.entity.spec.ts
│   │   │       └── revocation-event.entity.spec.ts
│   │   ├── users/
│   │   │   ├── users.service.spec.ts
│   │   │   └── entities/
│   │   │       └── user.entity.spec.ts
│   │   ├── webauthn/
│   │   │   ├── webauthn.service.spec.ts
│   │   │   ├── rp.service.spec.ts
│   │   │   └── entities/
│   │   │       └── webauthn-credential.entity.spec.ts
│   │   ├── keys/
│   │   │   ├── key-management.service.spec.ts
│   │   │   ├── key-rotation.service.spec.ts
│   │   │   └── entities/
│   │   │       └── signing-key.entity.spec.ts
│   │   ├── oidc-discovery/
│   │   │   └── oidc-discovery.service.spec.ts
│   │   ├── compliance/
│   │   │   ├── compliance.service.spec.ts
│   │   │   └── entities/
│   │   │       ├── compliance-job.entity.spec.ts
│   │   │       └── compliance-job-service.entity.spec.ts
│   │   ├── mfa/
│   │   │   └── mfa.service.spec.ts
│   │   └── privacy/
│   │       └── privacy.service.spec.ts
│   └── filters/
│       └── all-exceptions.filter.spec.ts
├── integration/
│   ├── auth-flow.int-spec.ts
│   ├── multi-tenant.int-spec.ts
│   ├── security.int-spec.ts
│   └── webauthn.int-spec.ts
├── e2e/
│   ├── webauthn.e2e-spec.ts
│   ├── token-management.e2e-spec.ts
│   ├── user-authentication.e2e-spec.ts
│   └── session-management.e2e-spec.ts
├── utils/
│   ├── test-data.ts
│   ├── mocks.ts
│   └── factories.ts
└── setup.ts
```

## Test Types and Purposes

### Unit Tests (`test/unit/`)
- Test individual components in isolation
- Use mocks for dependencies
- Fast execution for development feedback
- Cover all business logic paths

### Integration Tests (`test/integration/`)
- Test module-to-module interactions
- Verify data flow between services
- Test database operations with real PostgreSQL
- Validate multi-tenant isolation

### End-to-End Tests (`test/e2e/`)
- Test complete user flows
- Include external service interactions
- Verify complete authentication flows
- Test security scenarios end-to-end

## Test Utilities

- `test/utils/test-data.ts`: Export functions to create test data instances
- `test/utils/mocks.ts`: Export mock utilities for services and repositories
- `test/utils/factories.ts`: Export factory functions to create complex test objects

## Current Status

- **Unit Tests**: [ ] In Progress
- **Integration Tests**: [ ] Planned
- **E2E Tests**: [ ] Planned
- **Coverage**: [ ] 80%+ Required

## Running Tests

### Unit Tests
```bash
npm run test
# or for specific module
npm run test -- src/modules/auth/auth.service.spec.ts
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Coverage Report
```bash
npm run test:cov
```