# SmartEdify Platform — README

> Plataforma SaaS multi‑tenant para administración, gobernanza y operación de comunidades residenciales y comerciales en LATAM y Europa. Digitaliza asambleas híbridas con validez legal, centraliza mantenimiento, reservas, seguridad, cobros, comunicaciones y cumplimiento. Arquitectura de microservicios con API Gateway y mensajería por eventos. Foco en escalabilidad, observabilidad, seguridad y APIs versionadas para integraciones de terceros.

---

## 1) Visión general

**Objetivo**: operar comunidades con trazabilidad legal y eficiencia operativa.

**Dominios**: identidad, perfiles, tenancy, activos, gobernanza, notificaciones, finanzas, seguridad física, marketplace y analítica.

**Regiones**: LATAM y UE con parámetros locales de cumplimiento (GDPR y equivalentes regionales).

---

## 2) Arquitectura (mapa del repo y detalle)

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

> La arquitectura se mantiene completa al estilo original, ya alineada con buenas prácticas de modularidad y separación de responsabilidades. No se detectan cambios requeridos.

---

## 3) Tecnología base

* **Backend**: NestJS (Node.js) • TypeScript
* **DB**: PostgreSQL + TypeORM • RLS multi‑tenant
* **Mensajería**: Apache Kafka
* **Infra**: Docker • Docker Compose • Terraform • Envoy (Gateway)
* **Testing**: Jest • Supertest
* **Observabilidad**: OpenTelemetry • Prometheus • Grafana

---

## 4) Seguridad

### 4.1 Autenticación y flujo OIDC

* OAuth 2.1 + OIDC • `authorization_code + PKCE` obligatorio • Device Flow.
* DPoP PoP en writes y WS handshake.
* Refresh rotation con reuse detection.

### 4.2 Criptografía

* JWT `ES256/EdDSA` con `kid` obligatorio.
* **Prohibido** `HS256`.
* Rotación automática de claves cada **90 días** con **7 días** de rollover.
* JWKS por tenant • TTL ≤ 300 s • negative caching 60 s.

### 4.3 MFA y privacidad

* WebAuthn/Passkeys • TOTP.
* GDPR‑ready: DSAR, derecho al olvido, retención por política.

### 4.4 Aislamiento multi‑tenant

* RLS activo y FKs compuestas donde aplica.

---

## 5) Prerrequisitos

* Node.js ≥ 18 • npm ≥ 8
* Docker ≥ 20
* PostgreSQL ≥ 13
* Kafka (opcional para eventos locales)

---

## 6) Quick Start

### 6.1 Entorno mínimo local

```bash
# 1) Clonar
git clone <repository-url>
cd smartedify_app

# 2) Variables ejemplo
cp config/secrets/.env.example .env

# 3) Infra dev mínima (Postgres, Redis, Kafka opcional)
docker compose -f infra/dev/docker-compose.yml up -d

# 4) Instalar dependencias raíz y shared
npm install

# 5) Levantar Identity (servicio base para pruebas)
cd services/core/identity-service
npm install
npm run db:run-migrations
npm run start:dev
```

### 6.2 Verificación

```bash
curl -i http://localhost:3001/                      # health
curl http://localhost:3001/.well-known/openid-configuration?tenant_id=test
curl http://localhost:3001/metrics                  # Prometheus
```

> Para otros servicios, ver sus READMEs en `services/*/*/README.md`.

---

## 7) Testing y QA

### 7.1 Estrategia

* Unit • Integration • E2E (flujos OIDC, DPoP, multi‑tenant).
* Contract testing: OpenAPI y Pacts (BFF↔servicios).

### 7.2 Comandos

```bash
npm run test
npm run test:cov
npm run test:e2e
npm run validate    # lint, format, audit, contracts
```

### 7.3 Performance/Resiliencia

* k6 en `qa/k6/` • chaos en `qa/chaos/`.

---

## 8) Observabilidad

* Métricas Prometheus en `/metrics`.
* Trazas OTel con `tenant_id`, `trace_id`.
* Dashboards RED por servicio.
* Alertas: seguridad (replay/DPoP), latencia, errores, dependencias.

---

## 9) Flujo de desarrollo

### 9.1 Contracts‑first

1. Diseñar contrato en `contracts/openapi/`
2. Generar tipos/SDKs
3. Implementar
4. Validar contra spec y pacts

### 9.2 Calidad

* TypeScript strict • ESLint • Prettier • pre‑commit hooks.
* Escaneo de dependencias • secretos gestionados.

---

## 10) Despliegue

### 10.1 Producción

1. Configurar entorno.
2. Migraciones DB.
3. Verificación de seguridad (TLS, rotación llaves).
4. Observabilidad activa.
5. Health checks.

### 10.2 IaC y CI/CD

* Terraform módulos `infra/terraform/modules/` • entornos en `infra/terraform/envs/`.
* Pipelines CI en `.github/workflows/` con stages: lint → unit → contract → e2e → seguridad → deploy.

---

## 11) Contribución

### 11.1 Proceso

1. Fork y rama feature.
2. Estándares de código, pruebas, docs.
3. Checks verdes antes del PR.
4. Security review.
5. Actualizar documentación.

### 11.2 Convenciones de commit (Conventional Commits)

```text
feat(identity): add WebAuthn support
fix(auth): resolve DPoP replay issue
docs(readme): update API documentation
test(e2e): add OAuth flow tests
```

> Considerar CODEOWNERS y estrategia de ramas (`main`, `release/*`, `hotfix/*`).

---

## 12) PMV (Producto Mínimo Viable)

**Definición acordada del PMV**

**Servicios al 100% (alcance funcional completo):**

* **governance-service** *(incluye videoconferencias y todas las funciones definidas para asambleas híbridas)*.
* **asset-management-service** *(gestión de activos, mantenimiento, OTs, proveedores; versión build-freeze)*.
* **reservation-service** *(reservas de áreas comunes, check‑in, políticas y cobros opcionales).*

> Nota de arquitectura: se mantiene la separación de responsabilidades técnica. La videoconferencia está implementada por `streaming-service`, pero queda **operativamente integrada** y **paquetizada** dentro del alcance de `governance-service` para el PMV (contratos y flujos end‑to‑end sin exponer detalles al usuario final).

**Servicios de soporte (parciales) requeridos por el PMV:**

* **identity-service**: OIDC + OAuth 2.1 con PKCE, DPoP, rotación de claves, logout global.
* **user-profiles-service**: perfiles, membresías y roles locales esenciales para voz/voto y permisos de reserva.
* **tenancy-service**: modelo estructural (tenants, condominios, unidades) requerido por governance/reservations/asset.
* **compliance-service**: evaluación de políticas mínimas en tiempo de ejecución; DSAR y retención básica.
* **gateway-service**: validación L7 JWT/DPoP, CORS y rate‑limit por tenant.
* **notifications-service (mínimo viable)**: envío SMTP/SMS y registro de esquemas de eventos necesarios para QR/recordatorios.
* **documents-service (mínimo viable)**: almacenamiento de evidencias y actas con **firma electrónica básica** para validez legal.

**Criterios de aceptación PMV (DoD):**

1. **Asamblea híbrida E2E**: Convocatoria → verificación de quórum → videoconferencia integrada → votación → acta firmada y distribuida.
2. **Reservas E2E**: creación → evaluación de políticas → pago opcional → check‑in (QR) → auditoría sin PII pública.
3. **Asset E2E**: incidencia → clasificación → OT (técnico o soft) → cierre → notificación → métricas básicas.
4. **Seguridad**: JWT ES256/EdDSA con `kid`, DPoP en writes, PKCE obligatorio; JWKS TTL ≤ 300 s.
5. **Multi‑tenant**: RLS activo y pruebas negativas de cruce de datos.
6. **Observabilidad**: métricas RED y trazas OTel por servicio; tableros mínimos en Grafana.
7. **Legal**: política de retención y DSAR operativa; actas con firma electrónica básica disponible.

**Exclusiones PMV:** payroll, hr‑compliance, marketplace, analytics avanzados.

---

## 13) Riesgos y dependencias críticas

* **P0**: `notifications-service` y `documents-service` pendientes. Riesgo para streaming y validez legal. Plan: priorizar MVP notificac.
* **Rotación de claves/JWKS**: TTL ≤ 300 s y rollover 7 días. Validadores deben honrar `kid`.
* **Compliance runtime**: fallback seguro `fail‑closed` cuando no haya política.

---

## 14) Licencia y soporte

* **Licencia**: Software propietario. Todos los derechos reservados.
* **Soporte**: READMEs por servicio • OpenAPI en `contracts/` • ejemplos en tests • issues en el tracker.
