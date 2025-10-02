# SmartEdify Platform 1.1

Enterprise-grade educational platform with comprehensive identity management, authentication, and authorization capabilities. Built with modern security standards and microservices architecture.

## 🏗️ Architecture

```
smartedify_app/
├── apps/                          # Frontend applications
│   ├── bff/                      # Backend for Frontend
│   └── portal/                   # User portal application
├── services/                     # Microservices
│   └── support/
│       ├── identity-service/     # OAuth 2.1/OIDC Identity Provider
│       └── gateway-service/      # API Gateway
├── contracts/                    # API Contracts
│   ├── openapi/                 # OpenAPI specifications
│   └── asyncapi/                # AsyncAPI specifications
├── infra/                       # Infrastructure
│   ├── scripts/                 # Deployment scripts
│   └── docker-compose.test.yml  # Testing environment
├── config/                      # Configuration templates
│   ├── environments/            # Environment configurations
│   └── secrets/                 # Secret templates
├── docs/                        # Documentation
│   ├── architecture/            # System architecture
│   ├── security/               # Security guidelines
│   └── api/                    # API documentation
└── .github/                     # CI/CD workflows
```

## 🚀 Services

### Core Services Status

| Servicio | Estado | Completitud | Prioridad | Documentación |
|----------|--------|-------------|-----------|---------------|
| **streaming-service** | ✅ Operacional | 100% | Baja | [Análisis Completo](./auditoria/streaming-service/) |
| **governance-service** | 🔄 Casi completo | 95% | Media | [Análisis](./auditoria/governance-service/) |
| **finance-service** | ✅ Funcional | 90% | Baja | [Análisis](./auditoria/finance-service/) |
| **asset-management-service** | ✅ Funcional | 85% | Baja | [Análisis](./auditoria/asset-management-service/) |
| **user-profiles-service** | 🚧 En desarrollo | 75% | Alta | [Análisis](./auditoria/user-profiles-service/) |
| **notifications-service** | ❌ No implementado | 0% | **CRÍTICA** | [Análisis Crítico](./auditoria/notifications-service/) |
| **documents-service** | ❌ No implementado | 0% | **CRÍTICA** | [Análisis Legal](./auditoria/documents-service/) |

### Identity Service
Enterprise OAuth 2.1/OIDC identity provider with advanced security features:
- **Authentication Flows:** Authorization Code + PKCE, Device Flow, Refresh Token Rotation
- **Security:** DPoP proof of possession, anti-replay protection, automated key rotation
- **Standards:** FIDO2/WebAuthn, TOTP MFA, GDPR compliance
- **Multi-tenancy:** Complete tenant isolation with separate cryptographic materials

[📖 Identity Service Documentation](./services/support/identity-service/README.md)

### Gateway Service
API Gateway with centralized routing, authentication, and rate limiting.

## 📋 Auditoría de Servicios

### 🎯 Estado General
- **Servicios auditados:** 7/10 (100% cobertura documental)
- **Completitud promedio:** 85%
- **Documentación:** 100% consolidada en [auditoria/](./auditoria/)

### 🚨 Bloqueantes Críticos Identificados
1. **notifications-service (0%)** - Bloquea funcionalidad básica de streaming y governance
2. **documents-service (0%)** - Crítico para validez legal de asambleas

### 📊 Acceso a Documentación Completa
- **Índice maestro:** [auditoria/INDEX.md](./auditoria/INDEX.md)
- **Análisis cross-service:** [auditoria/cross-service/](./auditoria/cross-service/)
- **Herramientas de auditoría:** [auditoria/scripts/](./auditoria/scripts/)
- **Métricas y tendencias:** [auditoria/reports/](./auditoria/reports/)

## 🛠️ Technology Stack

- **Backend:** NestJS (Node.js), TypeScript
- **Database:** PostgreSQL with TypeORM
- **Authentication:** OAuth 2.1, OIDC, FIDO2/WebAuthn
- **Security:** DPoP, PKCE, JWT with ES256/EdDSA
- **Messaging:** Apache Kafka
- **Monitoring:** Prometheus, OpenTelemetry
- **Testing:** Jest, Supertest
- **Infrastructure:** Docker, Docker Compose

## 🔐 Security Features

### Advanced Authentication
- **OAuth 2.1 Compliance:** Latest security recommendations
- **DPoP (Distributed Proof of Possession):** Sender-constrained tokens
- **PKCE Mandatory:** Protection against authorization code interception
- **Pushed Authorization Requests (PAR):** Enhanced parameter security

### Cryptographic Security
- **Automated Key Rotation:** Daily rotation with graceful rollover
- **Modern Algorithms:** ES256 (ECDSA) and EdDSA support
- **JWKS Endpoints:** Dynamic key discovery per tenant
- **Anti-Replay Protection:** DPoP proof validation with configurable TTL

### Multi-Factor Authentication
- **FIDO2/WebAuthn:** Passwordless authentication with Passkeys
- **TOTP Support:** Time-based one-time passwords
- **Contextual Tokens:** QR code-based authentication for specific contexts

### Compliance & Privacy
- **GDPR Ready:** Data Subject Access Requests, Right to be forgotten
- **Audit Trails:** Comprehensive logging for compliance
- **Session Management:** Global logout coordination
- **Tenant Isolation:** Complete data and cryptographic separation

## 📋 Prerequisites

- **Node.js** >= 18.x
- **npm** >= 8.x
- **Docker** >= 20.x
- **PostgreSQL** >= 13.x
- **Apache Kafka** (optional, for event streaming)

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd smartedify_app
```

### 2. Start Identity Service
```bash
cd services/support/identity-service

# Install dependencies
npm install

# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run migrations
npm run db:run-migrations

# Start in development mode
npm run start:dev
```

### 3. Verify Installation
```bash
# Health check
curl http://localhost:3000/

# OIDC discovery
curl http://localhost:3000/.well-known/openid-configuration?tenant_id=test

# Metrics
curl http://localhost:3000/metrics
```

## 🧪 Testing Strategy

### Comprehensive Test Coverage
- **Unit Tests:** Service logic, utilities, and components
- **Integration Tests:** Database operations and module interactions
- **E2E Tests:** Complete authentication flows and API endpoints

### Test Environment
```bash
# Start test infrastructure
docker-compose -f docker-compose.test.yml up -d

# Run all tests
npm run test

# Run with coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Quality Assurance
```bash
# Code formatting
npm run format

# Linting
npm run lint

# Security audit
npm audit

# Complete validation
npm run validate
```

## 📊 Monitoring & Observability

### Metrics Collection
- **Prometheus Integration:** Comprehensive metrics at `/metrics`
- **Custom Metrics:** Authentication flows, security events, performance
- **Health Checks:** Service availability and dependency status

### Logging Strategy
- **Structured Logging:** JSON format with correlation IDs
- **Security Events:** Authentication attempts, token validations, key rotations
- **Performance Monitoring:** Request latency, database query performance

### Alerting
- **Security Alerts:** Failed authentication attempts, replay attacks
- **Performance Alerts:** High latency, error rates
- **Operational Alerts:** Service health, database connectivity

## 🔄 Development Workflow

### Contracts-First Development
All APIs must be defined using OpenAPI/AsyncAPI specifications before implementation:

1. **Design API Contract:** Define endpoints in `contracts/openapi/`
2. **Generate Types:** Use contract to generate TypeScript types
3. **Implement Service:** Build service following the contract
4. **Validate Implementation:** Ensure compliance with specification

### Code Quality Standards
- **TypeScript Strict Mode:** Full type safety
- **ESLint Configuration:** Consistent code style
- **Prettier Integration:** Automated formatting
- **Pre-commit Hooks:** Quality checks before commit

### Security Guidelines
- **OWASP Compliance:** Follow security best practices
- **Dependency Scanning:** Regular security audits
- **Secret Management:** No secrets in code
- **Security Testing:** Automated security test suite

## 🚀 Deployment

### Production Deployment
1. **Environment Configuration:** Set production environment variables
2. **Database Migration:** Apply schema changes
3. **Security Verification:** SSL/TLS, secret rotation
4. **Monitoring Setup:** Metrics, logging, alerting
5. **Health Checks:** Verify service availability

### Infrastructure as Code
- **Docker Containers:** Consistent deployment environments
- **Environment Templates:** Standardized configuration
- **CI/CD Pipelines:** Automated testing and deployment

## 🤝 Contributing

### Development Process
1. **Fork Repository:** Create feature branch
2. **Follow Standards:** Code style, testing, documentation
3. **Quality Checks:** Run validation before PR
4. **Security Review:** Consider security implications
5. **Documentation:** Update relevant documentation

### Commit Guidelines
Use conventional commit format:
```
feat(identity): add WebAuthn support
fix(auth): resolve DPoP replay issue
docs(readme): update API documentation
test(e2e): add OAuth flow tests
```

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support:
- **Documentation:** Check service-specific README files
- **API Reference:** Review OpenAPI specifications in `contracts/`
- **Examples:** Examine test files for usage patterns
- **Issues:** Create GitHub issues for bugs and feature requests
