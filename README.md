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
│  │  ├─ streaming-service/     # Puerto 3014 - Video en vivo, escaneo QR, transcripción
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

> Nota: `notifications-service` y `documents-service` son bloqueantes P0 para funcionalidades completas de streaming y validez legal de asambleas.

| Servicio                     | Estado                    | Completitud | Prioridad   | Documentación                                          |
| ---------------------------- | ------------------------- | ----------- | ----------- | ------------------------------------------------------ |
| **streaming-service**        | ✅ Funcional (dep. notifs) | 90%         | **Media**   | [Análisis Completo](./auditoria/streaming-service/)    |
| **governance-service**       | 🔄 Casi completo          | 95%         | Media       | [Análisis](./auditoria/governance-service/)            |
| **finance-service**          | ✅ Funcional               | 90%         | Baja        | [Análisis](./auditoria/finance-service/)               |
| **asset-management-service** | ✅ Funcional               | 85%         | Baja        | [Análisis](./auditoria/asset-management-service/)      |
| **user-profiles-service**    | 🚧 En desarrollo          | 75%         | Alta        | [Análisis](./auditoria/user-profiles-service/)         |
| **notifications-service**    | ❌ No implementado         | 0%          | **CRÍTICA** | [Análisis Crítico](./auditoria/notifications-service/) |
| **documents-service**        | ❌ No implementado         | 0%          | **CRÍTICA** | [Análisis Legal](./auditoria/documents-service/)       |

### Identity Service

Proveedor de identidad OAuth **2.1** + **OIDC** con seguridad avanzada:

* **Authentication Flows:** Authorization Code + PKCE, Device Flow, Refresh Token Rotation
* **Security:** DPoP proof of possession, anti-replay protection, automated key rotation
* **Standards:** FIDO2/WebAuthn, TOTP MFA, GDPR compliance
* **Multi-tenancy:** Aislamiento total por tenant con materiales criptográficos separados

📖 Documentación: `./services/core/identity-service/README.md`

### Gateway Service

API Gateway con ruteo centralizado, **validación L7 de JWT/DPoP**, CORS y rate limiting. No emite ni valida identidad a nivel de dominio.

## 📋 Auditoría de Servicios

### 🎯 Estado General

* **Servicios auditados:** 7/10 (100% cobertura documental)
* **Completitud promedio:** 85%
* **Documentación:** 100% consolidada en [auditoria/](./auditoria/)

### 🚨 Bloqueantes Críticos Identificados

1. **notifications-service (0%)** — Bloquea funcionalidad básica de streaming y governance
2. **documents-service (0%)** — Crítico para validez legal de asambleas

### 📊 Acceso a Documentación Completa

* **Índice maestro:** [auditoria/INDEX.md](./auditoria/INDEX.md)
* **Análisis cross-service:** [auditoria/cross-service/](./auditoria/cross-service/)
* **Herramientas de auditoría:** [auditoria/scripts/](./auditoria/scripts/)
* **Métricas y tendencias:** [auditoria/reports/](./auditoria/reports/)

## 🛠️ Technology Stack

* **Backend:** NestJS (Node.js), TypeScript
* **Database:** PostgreSQL with TypeORM
* **Authentication:** OAuth 2.1, OIDC, FIDO2/WebAuthn
* **Security:** DPoP, PKCE, JWT con ES256/EdDSA
* **Messaging:** Apache Kafka
* **Monitoring:** Prometheus, OpenTelemetry
* **Testing:** Jest, Supertest
* **Infrastructure:** Docker, Docker Compose

## 🔐 Security Features

### Advanced Authentication

* **OAuth 2.1 Compliance:** Recomendaciones de seguridad vigentes
* **DPoP (Distributed Proof of Possession):** Sender-constrained tokens
* **PKCE Mandatory:** Protección ante interceptación de authorization code
* **Pushed Authorization Requests (PAR):** Seguridad de parámetros

### Cryptographic Security

* **Automated Key Rotation:** Rotación automática cada 90 días con rollover de 7 días
* **Modern Algorithms:** ES256 (ECDSA) y EdDSA
* **JWKS Endpoints:** Descubrimiento dinámico por tenant
* **Anti-Replay Protection:** Validación DPoP con TTL configurable
* **Prohibido HS256; solo ES256 o EdDSA.**
* **JWKS TTL ≤ 300 s; negative caching 60 s.**

### Multi-Factor Authentication

* **FIDO2/WebAuthn:** Passkeys
* **TOTP Support:** OTP basados en tiempo
* **Contextual Tokens:** Autenticación contextual por QR

### Compliance & Privacy

* **GDPR Ready:** DSAR, derecho al olvido
* **Audit Trails:** Trazabilidad completa
* **Session Management:** Cierre global de sesión
* **Tenant Isolation:** Separación de datos y claves

## 📋 Prerequisites

* **Node.js** >= 18.x
* **npm** >= 8.x
* **Docker** >= 20.x
* **PostgreSQL** >= 13.x
* **Apache Kafka** (opcional, para eventos)

## 🚀 Quick Start

> Para pruebas locales, consume `identity-service` directamente en su puerto interno. Vía gateway el prefijo es `/api/v1/identity/*`.

### 1. Clonar repositorio

```bash
git clone <repository-url>
cd smartedify_app
```

### 2. Iniciar Identity Service

```bash
cd services/core/identity-service

# Instalar dependencias
npm install

# Base de datos de prueba
docker-compose -f docker-compose.test.yml up -d

# Migraciones
npm run db:run-migrations

# Desarrollo
npm run start:dev
```

### 3. Verificar instalación (puerto 3001)

```bash
# Health check
echo "Expect 200" && curl -i http://localhost:3001/

# OIDC discovery
echo "OIDC" && curl http://localhost:3001/.well-known/openid-configuration?tenant_id=test

# Metrics
echo "Metrics" && curl http://localhost:3001/metrics
```

## 🧪 Testing Strategy

### Cobertura integral

* **Unit Tests:** lógica de servicios y utilidades
* **Integration Tests:** base de datos e interacciones de módulos
* **E2E Tests:** flujos completos de autenticación y endpoints

### Entorno de pruebas

```bash
# Infra de pruebas
docker-compose -f docker-compose.test.yml up -d

# Ejecutar pruebas
npm run test

# Coverage
npm run test:cov

# E2E	npm run test:e2e
```

### Quality Assurance

```bash
# Formato
npm run format

# Lint
npm run lint

# Auditoría de seguridad
npm audit

# Validación completa
npm run validate
```

## 📊 Monitoring & Observability

### Métricas

* **Prometheus:** `/metrics`
* **Métricas personalizadas:** flujos de autenticación, eventos de seguridad, performance
* **Health Checks:** disponibilidad y dependencias

### Logging

* **Estructurado JSON:** con correlation IDs
* **Eventos de seguridad:** intentos de autenticación, validaciones de token, rotación de claves
* **Performance:** latencia de request, queries de BD

### Alerting

* **Security Alerts:** intentos fallidos, replay
* **Performance Alerts:** alta latencia, tasas de error
* **Operational Alerts:** salud de servicios, conectividad

## 🔄 Development Workflow

### Contracts-First Development

1. **Diseñar contrato** en `contracts/openapi/`
2. **Generar tipos** a partir del contrato
3. **Implementar servicio** según contrato
4. **Validar implementación** contra especificación

### Code Quality Standards

* **TypeScript Strict Mode**
* **ESLint**
* **Prettier**
* **Pre-commit Hooks**

### Security Guidelines

* **OWASP Compliance**
* **Dependency Scanning**
* **Secret Management**
* **Security Testing**

## 🚀 Deployment

### Production Deployment

1. **Configurar entorno**
2. **Migraciones de base de datos**
3. **Verificación de seguridad** (SSL/TLS, rotación de llaves)
4. **Monitoring** (métricas, logging, alerting)
5. **Health checks**

### Infrastructure as Code

* **Docker** para entornos consistentes
* **Plantillas de entornos** estandarizadas
* **CI/CD** con pruebas y despliegue automatizado

## 🤝 Contributing

### Development Process

1. **Fork** y rama de feature
2. **Estándares** de código, pruebas, docs
3. **Quality checks** antes del PR
4. **Security review**
5. **Actualizar documentación**

### Commit Guidelines

Usa **Conventional Commits**:

```
feat(identity): add WebAuthn support
fix(auth): resolve DPoP replay issue
docs(readme): update API documentation
test(e2e): add OAuth flow tests
```

## 📄 License

Este proyecto es software propietario. Todos los derechos reservados.

## 🆘 Support

* **Documentación:** READMEs específicos por servicio
* **API Reference:** OpenAPI en `contracts/`
* **Examples:** tests de referencia
* **Issues:** crear tickets para bugs y features
