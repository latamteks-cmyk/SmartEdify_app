# Test Data Seeding

This directory contains seed data and utilities for populating the test database with sample data.

## Seed Data Structure

The seed data includes 5 example records for each major entity as required:

1. **Users** - 5 users across different tenants with various statuses
2. **WebAuthn Credentials** - Associated credentials for each user
3. **Sessions** - Active sessions for each user
4. **Refresh Tokens** - Tokens for each user session
5. **Revocation Events** - Sample events for testing revocation scenarios

## Usage

To seed the test database:

```bash
# From the project root
npm run seed:test
```

Or directly run the seed script:

```bash
npx ts-node test/utils/seed-database.ts
```

## Environment Variables

The seed script uses the following environment variables:

- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_USERNAME` - Database username (default: user)
- `DB_PASSWORD` - Database password (default: password)
- `DB_TEST_DATABASE` - Test database name (default: identity_test_db)

## Data Relationships

The seed data maintains proper relationships between entities:

- Each user has an associated WebAuthn credential
- Each user has an active session
- Each session has an associated refresh token
- Some users have revocation events

This structure allows for comprehensive testing of authentication flows, token management, and security features.