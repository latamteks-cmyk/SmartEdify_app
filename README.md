# SmartEdify Platform 1.1

SmartEdify es una plataforma SaaS multi-tenant para la administración, gobernanza y operación de comunidades residenciales y comerciales: digitaliza asambleas híbridas con validez legal, centraliza mantenimiento, reservas, seguridad, cobros, comunicaciones y cumplimiento, y ofrece una arquitectura de microservicios con API Gateway y mensajería por eventos (identidad, perfiles, tenancy, activos, gobierno, notificaciones, marketplace, analytics y más); está diseñada para LATAM y Europa con foco en escalabilidad, observabilidad, seguridad y APIs versionadas para integraciones de terceros.

## 🏗️ Architecture

```
smartedify_app/
├─ apps/
│  ├─ web-admin/                # Next.js (SSR/ISR), UI Admin
│  ├─ web-user/                 # Next.js, UI Usuario
│  ├─ mobile/                   # Expo/React Native
│  └─ bff/
│     ├─ admin/                 # BFF Admin (PKCE, CSRF, cache corto)
│     ├─ app/                   # BFF Usuario
│     └─ mobile/                # BFF Móvil
├─ services/
│  ├─ core/                     # Servicios fundamentales (Línea 1)
│  │  ├─ identity-service/      # Puerto 3001 - Gestión de identidad, JWT, RBAC/ABAC
│  │  ├─ user-profiles-service/ # Puerto 3002 - Perfiles de usuario, roles por condominio
│  │  ├─ tenancy-service/       # Puerto 3003 - Ciclo de vida de condominios, alícuotas
│  │  ├─ notifications-service/ # Puerto 3005 - Email, SMS, push, Event Schema Registry
│  │  └─ documents-service/     # Puerto 3006 - Gestión documental, firma electrónica
│  ├─ governance/               # Servicios de gobernanza (Línea 2)
│  │  ├─ governance-service/    # Puerto 3011 - Asambleas, votación, actas con IA
│  │  ├─ streaming-service/     # Puerto 3014 - Video en vivo, QR, transcripción
│  │  ├─ compliance-service/    # Puerto 3012 - Motor normativo global, validaciones
│  │  └─ reservation-service/   # Puerto 3013 - Reservas de áreas comunes
│  ├─ operations/               # Servicios operativos (Línea 3)
│  │  ├─ finance-service/       # Puerto 3007 - Cuotas, conciliación, PCGE/NIIF
│  │  ├─ asset-management-service/ # Puerto 3010 - Inventario, mantenimiento, proveedores
│  │  ├─ physical-security-service/ # Puerto 3004 - CCTV, control accesos, IoT
│  │  ├─ payroll-service/       # Puerto 3008 - Nóminas, PLAME, beneficios
│  │  └─ hr-compliance-service/ # Puerto 3009 - Ciclo empleado, SST, contratos
│  └─ business/                 # Servicios de negocio (Línea 4)
│     ├─ marketplace-service/   # Puerto 3015 - Ecosistema servicios premium
│     └─ analytics-service/     # Puerto 3016 - BI, dashboards, ML predictivo
├─ platform/
│  ├─ gateway/                  # Puerto 8080 - WAF, CORS, rate limits, enrutamiento (norte-sur)
│  ├─ mesh/                     # mTLS, S2S authZ, retries, circuit breaking
│  ├─ events/                   # AsyncAPI, esquemas, outbox/idempotencia
│  ├─ observability/            # Otel collectors, dashboards, SLOs
│  ├─ security/                 # OPA bundles, CSP/HSTS, KMS
│  └─ shared/                   # libs comunes (tipos, SDKs OpenAPI, tracing)
├─ contracts/
│  ├─ openapi/                  # `*-service.v1.yaml` + ejemplos
│  ├─ asyncapi/                 # eventos por dominio
│  └─ pacts/                    # tests consumidor-productor (BFF↔servicios)
├─ infra/
│  ├─ terraform/
│  │  ├─ modules/               # vpc, rds, redis, s3, cloudfront, waf, ecs, iam
│  │  └─ envs/                  # dev, stg, prod
│  └─ cicd/                     # pipelines, imágenes base, escáneres
├─ config/
│  ├─ dev/ stg/ prod/           # feature flags, parámetros no sensibles
│  └─ secrets/                  # plantillas .env.example (sin secretos)
├─ qa/
│  ├─ k6/                       # pruebas de carga
│  └─ chaos/                    # experimentos de resiliencia
├─ scripts/                     # bootstrap, codegen, db:*, lint, test
├─ .github/workflows/           # CI (lint, unit, contract, e2e, seguridad, deploy)
├─ doc/
│  ├─ adr/                      # Architecture Decision Records
│  ├─ diagrams/                 # mermaid/drawio
│  ├─ runbooks/                 # incident, DR, rotación claves, webhooks
│  ├─ security/                 # DPIA, amenazas, 29733, retención
│  └─ product/                  # roadmaps, criterios PMV
└─ README.md
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
