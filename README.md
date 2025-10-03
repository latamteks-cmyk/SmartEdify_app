<<<<<<< HEAD
# SmartEdify Global Platform

> **Plataforma SaaS global de gobernanza y gestión comunitaria**  
> Digitalización, automatización y validez legal para condominios en Latinoamérica y Europa

Repositorio monolítico para la plataforma SmartEdify v2.0. Arquitectura de microservicios modular, multi-tenant y multi-país, alineada al [SCOPE v2.0](./referencias/SCOPE.md) y las políticas descritas en [`doc/POLICY_INDEX.md`](./doc/POLICY_INDEX.md).

## 🏗️ Arquitectura General

**14 microservicios** organizados por líneas funcionales + plataforma + aplicaciones frontend.

### Estructura del Directorio

```text
smartedify_app/
├─ services/                    # 14 Microservicios (Puertos 3001-3016)
│  ├─ core/                     # Servicios fundamentales
│  │  ├─ identity-service/      # 3001 - JWT ES256/EdDSA, RBAC/ABAC, MFA
│  │  ├─ user-profiles-service/ # 3002 - Perfiles, roles por condominio
│  │  ├─ tenancy-service/       # 3003 - Multi-tenant, alícuotas, RLS
│  │  ├─ notifications-service/ # 3005 - Email/SMS/Push, Event Schema Registry
│  │  └─ documents-service/     # 3006 - Gestión documental, firma electrónica
│  ├─ governance/               # Gobernanza democrática digital
│  │  ├─ governance-service/    # 3011 - Asambleas, votación, actas IA (MCP)
│  │  ├─ compliance-service/    # 3012 - Motor normativo global, DSAR
│  │  ├─ reservation-service/   # 3013 - Reservas áreas comunes
│  │  └─ streaming-service/     # 3014 - Video híbrido, QR, transcripción
│  ├─ operations/               # Operaciones diarias
│  │  ├─ physical-security-service/ # 3004 - CCTV, biometría, IoT
│  │  ├─ finance-service/       # 3007 - Cuotas, PCGE/NIIF, conciliación
│  │  ├─ payroll-service/       # 3008 - Nóminas, PLAME, beneficios
│  │  ├─ hr-compliance-service/ # 3009 - RRHH, SST, contratos
│  │  └─ asset-management-service/ # 3010 - Mantenimiento predictivo
│  └─ business/                 # Nuevos modelos de negocio
│     ├─ marketplace-service/   # 3015 - Servicios premium, comisiones
│     └─ analytics-service/     # 3016 - BI, ML predictivo, dashboards
├─ platform/                    # Infraestructura transversal
│  ├─ gateway/                  # 8080 - WAF, mTLS, rate limits, observabilidad
│  ├─ mesh/                     # Service mesh, circuit breaking, retries
│  ├─ events/                   # Apache Kafka, AsyncAPI, Event Sourcing
│  ├─ observability/            # Prometheus, Grafana, OTel, logs WORM
│  ├─ security/                 # SPIFFE/SPIRE, OPA, KMS, CSP/HSTS
│  └─ shared/                   # SDKs, tipos comunes, librerías
├─ apps/                        # Aplicaciones frontend
│  ├─ web-admin/                # Next.js SSR - Portal administradores
│  ├─ web-user/                 # Next.js - Portal propietarios
│  ├─ mobile/                   # React Native - App móvil
│  └─ bff/                      # Backend for Frontend (PKCE, agregación)
├─ contracts/                   # API-First Design
│  ├─ openapi/                  # Contratos REST por servicio
│  ├─ asyncapi/                 # Esquemas de eventos por dominio
│  └─ pacts/                    # Contract testing (Pact)
├─ infra/                       # Infrastructure as Code
│  ├─ terraform/                # AWS/Multi-cloud, módulos reutilizables
│  └─ cicd/                     # Pipelines, imágenes base, security scans
├─ config/                      # Configuración por entorno
├─ qa/                          # Testing y chaos engineering
├─ doc/                         # Documentación técnica y ADRs
└─ scripts/                     # Automatización y tooling
```

├─ platform/
│ ├─ gateway/ # WAF, CORS, rate limits (norte-sur)
│ ├─ mesh/ # mTLS, S2S authZ, retries, circuit breaking
│ ├─ events/ # AsyncAPI, esquemas, outbox/idempotencia
│ ├─ observability/ # Otel collectors, dashboards, SLOs
│ ├─ security/ # OPA bundles, CSP/HSTS, KMS
│ └─ shared/ # libs comunes (tipos, SDKs OpenAPI, tracing)
├─ contracts/
│ ├─ openapi/ # `*-service.v1.yaml` + ejemplos
│ ├─ asyncapi/ # eventos por dominio
│ └─ pacts/ # tests consumidor-productor (BFF↔servicios)
├─ infra/
│ ├─ terraform/
│ │ ├─ modules/ # vpc, rds, redis, s3, cloudfront, waf, ecs, iam
│ │ └─ envs/ # dev, stg, prod
│ └─ cicd/ # pipelines, imágenes base, escáneres
├─ config/
│ ├─ dev/ stg/ prod/ # feature flags, parámetros no sensibles
│ └─ secrets/ # plantillas .env.example (sin secretos)
├─ qa/
│ ├─ k6/ # pruebas de carga
│ └─ chaos/ # experimentos de resiliencia
├─ scripts/ # bootstrap, codegen, db:\*, lint, test
├─ .github/workflows/ # CI (lint, unit, contract, e2e, seguridad, deploy)
├─ doc/
│ ├─ adr/ # Architecture Decision Records
│ ├─ diagrams/ # mermaid/drawio
│ ├─ runbooks/ # incident, DR, rotación claves, webhooks
│ ├─ security/ # DPIA, amenazas, 29733, retención
│ └─ product/ # roadmaps, criterios PMV
└─ README.md

````

## 🚀 Características Principales

### Gobernanza Democrática Digital
- **Asambleas híbridas** con validez legal adaptable multi-país (PMV: Perú)
- **Votación ponderada** por alícuotas con auditoría criptográfica
- **Transcripción IA** y generación automática de actas (MCP)
- **QR contextuales** para asistencia + biometría/SMS como alternativas

### Multi-Tenant Global
- **Shared Database, Shared Schema** con RLS por `condominium_id`
- **Motor de compliance** adaptable por país y tipo de propiedad
- **Localización** completa (i18n, monedas, formatos legales)

### Seguridad Enterprise
- **JWT asimétrico** (ES256/EdDSA) con `kid` obligatorio, PKCE
- **DPoP** (RFC 9449) para anti-replay distribuido
- **mTLS interno** con SPIFFE/SPIRE
- **DSAR automatizado** con crypto-erase cross-service

### Observabilidad Completa
- **Métricas** Prometheus con alertas SLO/SLA
- **Trazas distribuidas** OpenTelemetry
- **Logs WORM** a S3 con Object Lock para auditoría
- **Dashboards** Grafana para RED metrics

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| **Frontend** | React, Next.js, React Native | UIs web y móvil |
| **Backend** | Node.js, NestJS, TypeScript | Microservicios |
| **API Gateway** | Envoy Proxy + WASM | Seguridad, routing, observabilidad |
| **Bases de Datos** | PostgreSQL + RLS | Multi-tenant por servicio |
| **Mensajería** | Apache Kafka | Event-driven architecture |
| **Cache** | Redis | Sessions, rate limiting, anti-replay |
| **Storage** | AWS S3 | Documentos, videos, logs WORM |
| **Observabilidad** | Prometheus, Grafana, OTel | Métricas, logs, trazas |
| **Seguridad** | SPIFFE/SPIRE, OPA | mTLS, políticas de autorización |
| **Infraestructura** | Docker, Kubernetes, Terraform | Containerización, IaC |

## 🏃‍♂️ Quick Start

### Prerrequisitos
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Desarrollo Local

```bash
# 1. Clonar repositorio
git clone https://github.com/smartedify/smartedify_app.git
cd smartedify_app

# 2. Levantar plataforma (Gateway + dependencias)
cd platform/gateway
docker compose up -d

# 3. Ejecutar tests del gateway
./scripts/run_tests.ps1  # Windows
./scripts/test_gateway.sh  # Linux/Mac

# 4. Levantar servicios core
cd ../../services/core/identity-service
npm install && npm run dev

# 5. Acceder a las aplicaciones
# - Gateway: http://localhost:8080
# - Admin UI: http://localhost:4000
# - User UI: http://localhost:3000
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001
````

### Validar Contratos API

```bash
# Instalar Spectral
npm install -g @stoplight/spectral-cli

# Validar todos los contratos OpenAPI
spectral lint contracts/openapi/*.yaml --ruleset .spectral.yml
```

## 📋 Roadmap y Estado

### ✅ Completado (v2.0)

- [x] Arquitectura de microservicios con 14 servicios
- [x] Gateway con mTLS, WAF, rate limiting, observabilidad
- [x] Contratos OpenAPI para servicios principales
- [x] Pipeline CI/CD con testing automatizado
- [x] Eventos AsyncAPI para governance
- [x] Documentación técnica completa

### 🚧 En Desarrollo

- [ ] Implementación de servicios nuevos (streaming, marketplace, analytics)
- [ ] Plugin DPoP real (reemplazar placeholder WASM)
- [ ] Integración con Google Meet API
- [ ] Modelos ML para analytics predictivo

### 📅 Próximas Fases

- **Q1 2025**: Lanzamiento Perú (PMV)
- **Q2 2025**: Expansión Chile y Colombia
- **Q3 2025**: México y España
- **2026**: Brasil y resto de LATAM
- **2027**: Mercado Europeo (GDPR)

## 🤝 Contribución

### Flujo de Desarrollo

1. **Fork** del repositorio
2. **Branch** desde `develop`: `feature/nueva-funcionalidad`
3. **Commits** siguiendo [Conventional Commits](https://conventionalcommits.org/)
4. **Tests** y validación de contratos
5. **Pull Request** con template completo
6. **Review** por CODEOWNERS correspondientes

### Políticas y Convenciones

- **API-First**: Contratos OpenAPI antes de implementación
- **Security-First**: Validación de seguridad en cada PR
- **Contract Testing**: Pact para integración BFF↔Services
- **Event-Driven**: AsyncAPI para comunicación asíncrona

Ver [`doc/POLICY_INDEX.md`](./doc/POLICY_INDEX.md) para políticas completas.

## 📚 Documentación

| Documento                                        | Descripción                          |
| ------------------------------------------------ | ------------------------------------ |
| [`SCOPE.md`](./referencias/SCOPE.md)             | Especificación técnica completa v2.0 |
| [`doc/POLICY_INDEX.md`](./doc/POLICY_INDEX.md)   | Índice de políticas y convenciones   |
| [`MIGRATION_SUMMARY.md`](./MIGRATION_SUMMARY.md) | Resumen de migración a v2.0          |
| [`doc/diagrams/`](./doc/diagrams/)               | Diagramas de arquitectura            |
| [`doc/adr/`](./doc/adr/)                         | Architecture Decision Records        |
| [`doc/security/`](./doc/security/)               | Políticas de seguridad               |
| [`doc/runbooks/`](./doc/runbooks/)               | Guías operacionales                  |

## 🛡️ Seguridad

Para reportar vulnerabilidades de seguridad, consulta [`SECURITY.md`](./SECURITY.md).

## 📄 Licencia

© 2025 SmartEdify Global. Todos los derechos reservados.

---

> **SmartEdify**: Convirtiendo la gobernanza comunitaria en una experiencia digital transparente, segura y legalmente válida. 🏢✨
=======
 

# SmartEdify Monorepo

Repositorio monolítico para la plataforma SmartEdify. Sigue una arquitectura modular, multi-servicio y multi-frontend, alineada a las políticas y convenciones descritas en `POLICY_INDEX.md`.

## Estructura del directorio principal

```text
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
│  ├─ pmv/                      # Línea 1 (Assembly, Reservation, Maintenance)
│  │  ├─ assembly-service/
│  │  ├─ reservation-service/
│  │  └─ maintenance-service/
│  ├─ support/                  # Línea 2 (fundacionales)
│  │  ├─ auth-service/
│  │  ├─ user-service/
│  │  ├─ tenants-service/
│  │  ├─ document-service/
│  │  ├─ communication-service/
│  │  └─ finance-service/
│  └─ complementary/            # Línea 3 (complementarios)
│     ├─ payments-service/
│     ├─ compliance-service/
│     ├─ payroll-service/
│     ├─ certification-service/
│     ├─ support-bot-service/
│     └─ facility-security-service/
├─ platform/
│  ├─ gateway/                  # WAF, CORS, rate limits (norte-sur)
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

## Políticas y convenciones

- Todas las normas, plantillas y convenciones están centralizadas en [`doc/POLICY_INDEX.md`](../doc/POLICY_INDEX.md).
- Cambios a la estructura, políticas o convenciones requieren PR, revisión de CODEOWNERS y actualización del índice.
- Cada carpeta relevante debe tener su propio README.md y/o documentación específica.

## Gobierno y calidad

- Versionado SemVer, releases y ramas documentadas en `/VERSIONING.md` y `/RELEASE_PROCESS.md`.
- Seguridad, privacidad y operación documentadas en `/SECURITY.md`, `/doc/security/` y `/doc/runbooks/`.
- Calidad y pruebas: ver `/doc/policies/`, `/qa/`, `/contracts/` y `/platform/events/`.

---

> Para detalles, consulta el índice de políticas y la documentación de cada dominio.

>>>>>>> origin/main
