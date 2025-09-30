# Identity Service

Enterprise-grade Identity Service for the SmartEdify-A platform. Built with NestJS, this microservice provides comprehensive identity management, authentication, and authorization capabilities following modern security standards including OAuth 2.1, OIDC, FIDO2/WebAuthn, and DPoP.

## 🚀 Features

### Authentication & Authorization
- **OAuth 2.1 Compliant Flows:**
  - Authorization Code Flow with PKCE (Proof Key for Code Exchange)
  - Device Authorization Flow for input-constrained devices
  - Refresh Token Rotation with family tracking
  - Token introspection and revocation
- **Advanced Security:**
  - DPoP (Distributed Proof of Possession) for sender-constrained tokens
  - Pushed Authorization Requests (PAR) for enhanced security
  - Anti-replay protection for DPoP proofs
  - Backchannel logout support
- **Multi-Factor Authentication:**
  - FIDO2/WebAuthn (Passkeys) registration and authentication
  - TOTP (Time-based One-Time Password) support
  - Contextual QR code tokens

### Key Management & Security
- **Automated Key Rotation:**
  - Daily automated signing key rotation
  - Tenant-aware key isolation
  - ES256 and EdDSA algorithm support
- **Tenant Isolation:**
  - Multi-tenant architecture with secure key separation
  - Tenant-specific JWKS endpoints
  - Isolated user sessions and data

### Compliance & Privacy
- **GDPR Compliance:**
  - Data Subject Access Requests (DSAR)
  - Right to be forgotten (data deletion)
  - Consent audit trails
- **Session Management:**
  - Comprehensive session tracking
  - Global and selective session revocation
  - Session-based logout coordination

### Observability & Monitoring
- **Metrics & Monitoring:**
  - Prometheus metrics integration
  - Comprehensive logging with structured output
  - Health check endpoints
- **Policy Engine:**
  - Open Policy Agent (OPA) integration
  - Fine-grained authorization policies
  - Resource-based access control

## 🛠️ Technology Stack

- **Framework:** NestJS (Node.js)
- **Database:** PostgreSQL with TypeORM
- **Authentication:** OAuth 2.1, OIDC, FIDO2/WebAuthn
- **Security:** DPoP, PKCE, JWT with ES256/EdDSA
- **Messaging:** Apache Kafka (KafkaJS)
- **Monitoring:** Prometheus metrics
- **Policy Engine:** Open Policy Agent (OPA)
- **Testing:** Jest (Unit & E2E tests)

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 8.x
- **PostgreSQL** >= 13.x
- **Docker** (for testing environment)

### Installation

1. **Clone and navigate to the service:**
   ```bash
   git clone <repository-url>
   cd smartedify_app/services/support/identity-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the service root:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=user
   DB_PASSWORD=password
   DB_DATABASE=identity_db
   
   # Application Configuration
   PORT=3000
   NODE_ENV=development
   
   # Security Configuration
   JWT_SECRET=your-jwt-secret
   ENCRYPTION_KEY=your-encryption-key
   ```

### Database Setup

1. **Start PostgreSQL** (or use Docker):
   ```bash
   docker run --name postgres-identity \
     -e POSTGRES_DB=identity_db \
     -e POSTGRES_USER=user \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 -d postgres:15-alpine
   ```

2. **Run migrations:**
   ```bash
   npm run db:run-migrations
   ```

### Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

The service will be available at `http://localhost:3000`

### Development Workflow

```bash
# Format code
npm run format

# Lint code
npm run lint

# Run quality validation
npm run validate

# Pre-commit checks
npm run pre-commit
```

## 🧪 Testing

The service includes comprehensive testing with unit tests, integration tests, and end-to-end tests.

### Test Environment Setup

1. **Start test database:**
   ```bash
   docker-compose -f docker-compose.test.yml up -d
   ```

2. **Wait for database to be ready:**
   ```bash
   # The compose file includes health checks
   docker-compose -f docker-compose.test.yml ps
   ```

### Running Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# End-to-end tests
npm run test:e2e

# Watch mode for development
npm run test:watch

# Debug tests
npm run test:debug
```

### Test Coverage

The project maintains high test coverage across:
- **Unit Tests:** Service logic, utilities, and components
- **Integration Tests:** Database operations and module interactions  
- **E2E Tests:** Complete authentication flows and API endpoints

Key test scenarios include:
- OAuth 2.1 flows (Authorization Code, Device Flow)
- DPoP proof validation and replay protection
- WebAuthn registration and authentication
- Key rotation and tenant isolation
- Compliance workflows (GDPR, data export/deletion)

## 📚 API Documentation

### Core Endpoints

#### Health & Discovery
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | `GET` | Health check endpoint |
| `/.well-known/openid-configuration` | `GET` | OIDC discovery configuration |
| `/.well-known/jwks.json` | `GET` | JSON Web Key Set for token verification |
| `/metrics` | `GET` | Prometheus metrics for monitoring |

#### OAuth 2.1 & OIDC Flows
| Endpoint | Method | Description | Security |
|----------|--------|-------------|----------|
| `/oauth/par` | `POST` | Pushed Authorization Request | Client Authentication |
| `/oauth/authorize` | `GET` | Authorization endpoint (supports PAR) | PKCE Required |
| `/oauth/token` | `POST` | Token exchange endpoint | DPoP Required |
| `/oauth/device_authorization` | `POST` | Device authorization flow initiation | Client Authentication |
| `/oauth/revoke` | `POST` | Token revocation | Client Authentication |
| `/oauth/introspect` | `POST` | Token introspection | Client Authentication |

#### Authentication & Logout
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/logout` | `POST` | Front-channel logout |
| `/backchannel-logout` | `POST` | Back-channel logout token processing |

#### User Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users` | `POST` | Create new user account |

#### WebAuthn (FIDO2/Passkeys)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webauthn/registration/options` | `GET` | Generate registration options |
| `/webauthn/registration/verification` | `POST` | Verify registration response |
| `/webauthn/assertion/options` | `POST` | Generate authentication options |
| `/webauthn/assertion/result` | `POST` | Verify authentication response |

#### QR Code & Contextual Tokens
| Endpoint | Method | Description | Security |
|----------|--------|-------------|----------|
| `/identity/v2/contextual-tokens` | `POST` | Generate contextual QR tokens | DPoP Authentication |
| `/identity/v2/contextual-tokens/validate` | `POST` | Validate contextual tokens | DPoP Authentication |

#### Privacy & Compliance (GDPR)
| Endpoint | Method | Description | Security |
|----------|--------|-------------|----------|
| `/privacy/export` | `POST` | Export user data (DSAR) | DPoP Authentication |
| `/privacy/data` | `DELETE` | Delete user data (Right to be forgotten) | DPoP Authentication |

#### Session Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/identity/v2/sessions/active` | `GET` | Get active user sessions |
| `/identity/v2/sessions/:id/revoke` | `POST` | Revoke specific session |
| `/identity/v2/subject/revoke` | `POST` | Revoke all user sessions |

### Authentication Requirements

- **Client Authentication:** Required for OAuth endpoints using JWT client assertions
- **DPoP (Distributed Proof of Possession):** Required for token endpoints and protected resources
- **PKCE:** Mandatory for all authorization flows
- **Tenant Isolation:** All endpoints support multi-tenant operation via `tenant_id` parameter


## 🏗️ Architecture

### Project Structure

```
src/
├── config/                 # Configuration files
│   ├── database.config.ts  # Database configuration
│   ├── dpop.config.ts     # DPoP configuration
│   └── typeorm.config.ts  # TypeORM CLI configuration
├── db/
│   └── migrations/        # Database migrations
├── filters/               # Global exception filters
├── modules/               # Feature modules
│   ├── auth/             # OAuth 2.1 & OIDC implementation
│   ├── authorization/    # Policy-based authorization
│   ├── clients/          # OAuth client management
│   ├── compliance/       # GDPR compliance workflows
│   ├── jobs/            # Background job management
│   ├── kafka/           # Kafka messaging integration
│   ├── keys/            # Cryptographic key management
│   ├── metrics/         # Prometheus metrics
│   ├── mfa/             # Multi-factor authentication
│   ├── oidc-discovery/  # OIDC discovery endpoints
│   ├── privacy/         # Privacy and data protection
│   ├── qrcodes/         # QR code token generation
│   ├── sessions/        # Session management
│   ├── tokens/          # Token lifecycle management
│   ├── users/           # User account management
│   └── webauthn/        # FIDO2/WebAuthn implementation
├── app.controller.ts     # Main application controller
├── app.module.ts        # Root application module
├── app.service.ts       # Main application service
└── main.ts             # Application bootstrap
```

### Key Components

#### Authentication Flow
1. **PAR (Pushed Authorization Request):** Securely pre-register authorization parameters
2. **Authorization:** PKCE-protected authorization with support for PAR request_uri
3. **Token Exchange:** DPoP-bound token issuance with refresh token rotation
4. **Token Validation:** Comprehensive token introspection with replay protection

#### Security Features
- **DPoP Proof Validation:** Prevents token replay attacks
- **Key Rotation:** Automated daily rotation with graceful key rollover
- **Tenant Isolation:** Complete separation of cryptographic materials
- **Session Tracking:** Comprehensive session lifecycle management

#### Compliance Integration
- **Event-Driven Architecture:** Kafka-based compliance event processing
- **Audit Trails:** Complete audit logging for compliance requirements
- **Data Lifecycle:** Automated data retention and deletion workflows

## 🔧 Configuration

### Environment Variables

#### Database Configuration
```env
DB_HOST=localhost                    # Database host
DB_PORT=5432                        # Database port
DB_USERNAME=user                    # Database username
DB_PASSWORD=password                # Database password
DB_DATABASE=identity_db             # Database name
DB_TEST_DATABASE=identity_test_db   # Test database name
```

#### Application Configuration
```env
PORT=3000                          # Application port
NODE_ENV=development               # Environment (development/production)
```

#### Security Configuration
```env
JWT_SECRET=your-jwt-secret         # JWT signing secret
ENCRYPTION_KEY=your-encryption-key # Data encryption key
```

#### DPoP Configuration
```env
DPOP_MAX_IAT_SKEW_SECONDS=60      # Maximum IAT skew for DPoP proofs
DPOP_REPLAY_TTL_SECONDS=300       # DPoP replay protection TTL
DPOP_REPLAY_BACKEND=database      # Replay protection backend (database/redis)
```

#### Kafka Configuration (Optional)
```env
KAFKA_BROKERS=localhost:9092       # Kafka broker addresses
KAFKA_CLIENT_ID=identity-service   # Kafka client identifier
```

### Database Migrations

The service uses TypeORM migrations for database schema management:

```bash
# Generate a new migration
npm run db:generate-migration -- src/db/migrations/MigrationName

# Run pending migrations
npm run db:run-migrations

# Revert the last migration
npm run db:revert-migration
```

## 🔐 Security Considerations

### OAuth 2.1 Security
- **PKCE Mandatory:** All authorization flows require PKCE
- **DPoP Binding:** Tokens are bound to cryptographic proof of possession
- **PAR Usage:** Pushed Authorization Requests prevent parameter tampering
- **Refresh Token Rotation:** Automatic rotation with family tracking

### Key Management
- **Algorithm Support:** ES256 (ECDSA) and EdDSA for JWT signing
- **Automated Rotation:** Daily key rotation with 30-day overlap period
- **Tenant Isolation:** Complete cryptographic separation between tenants
- **Secure Storage:** Private keys encrypted at rest

### Anti-Replay Protection
- **DPoP JTI Tracking:** Prevents replay of DPoP proofs
- **Configurable TTL:** Adjustable replay protection window
- **Backend Options:** Database or Redis-based replay detection

### Session Security
- **Global Logout:** Coordinated session termination across services
- **Session Tracking:** Comprehensive audit trail for all sessions
- **Revocation Events:** Real-time session invalidation

## 📊 Monitoring & Observability

### Prometheus Metrics

The service exposes comprehensive metrics at `/metrics`:

#### Authentication Metrics
- `oauth_authorization_requests_total` - Total authorization requests
- `oauth_token_requests_total` - Total token requests
- `oauth_token_validation_duration` - Token validation latency
- `dpop_proof_validations_total` - DPoP proof validations

#### Security Metrics
- `key_rotation_events_total` - Key rotation events
- `replay_attack_attempts_total` - Detected replay attempts
- `session_revocations_total` - Session revocation events

#### System Metrics
- `http_requests_total` - HTTP request counters
- `http_request_duration_seconds` - Request latency histograms
- `database_connections_active` - Active database connections

### Logging

Structured logging with configurable levels:
- **Development:** Query, error, and warning logs
- **Production:** Error logs only
- **Test:** Silent logging

Log format includes:
- Timestamp and log level
- Request correlation IDs
- User and tenant context
- Security event details

## 🚀 Deployment

### Docker Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Create production Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY dist/ ./dist/
   EXPOSE 3000
   CMD ["node", "dist/main.js"]
   ```

3. **Environment-specific configuration:**
   - Use environment variables for all configuration
   - Mount configuration files for complex setups
   - Ensure database connectivity before startup

### Production Checklist

- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] SSL/TLS certificates installed
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested
- [ ] Security scanning completed
- [ ] Load testing performed

## 🤝 Contributing

### Development Guidelines

1. **Code Style:** Follow the established ESLint and Prettier configuration
2. **Testing:** Maintain test coverage above 80%
3. **Documentation:** Update API documentation for any endpoint changes
4. **Security:** Follow OWASP guidelines for secure coding

### Pull Request Process

1. **Quality Checks:** Run `npm run validate` before submitting
2. **Testing:** Ensure all tests pass including E2E tests
3. **Documentation:** Update README and API docs as needed
4. **Security Review:** Consider security implications of changes

### Commit Guidelines

Use conventional commit format:
```
feat: add new OAuth endpoint
fix: resolve DPoP replay issue
docs: update API documentation
test: add WebAuthn integration tests
```

## 📄 License

This project is licensed under the terms specified in the main SmartEdify-A repository.

## 🆘 Support

For technical support and questions:
- Review the API documentation in `openapi/openapi.yaml`
- Check the test files for usage examples
- Consult the NestJS documentation for framework-specific questions

## 🔄 Changelog

### Version 0.0.1 (Current)
- Initial implementation of OAuth 2.1 flows
- DPoP proof of possession support
- WebAuthn/FIDO2 integration
- Automated key rotation
- GDPR compliance workflows
- Comprehensive test suite
- Prometheus metrics integration