Guía única de políticas y normas del repositorio **smartedify_app**. Todas las rutas son relativas a la raíz del monorepo. Cambios a cualquier política requieren PR, revisión de CODEOWNERS y actualización de este índice.

---

## Estructura del directorio

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

---

## 1) Gobierno del repositorio

* `/README.md` · Visión, stack, cómo ejecutar y contribuir.
* `/CONTRIBUTING.md` · Reglas de contribución, estilo de commits, revisión de PR.
* `/.github/CODEOWNERS` · Propietarios por ruta para revisión obligatoria.
* `/.github/PULL_REQUEST_TEMPLATE.md` · Checklist de PR (tests, seguridad, docs).
* `/.github/ISSUE_TEMPLATE/bug_report.md` · Plantilla de bug.
* `/.github/ISSUE_TEMPLATE/feature_request.md` · Plantilla de feature.
* `/SECURITY.md` · Reporte de vulnerabilidades y SLAs.
* `/CODE_OF_CONDUCT.md` · Código de conducta.

## 2) Versionado y entregas

* `/VERSIONING.md` · SemVer para paquetes y APIs (`/vN`).
* `/RELEASE_PROCESS.md` · Ramas, tagging, promoción dev→stg→prod.
* `/CHANGELOG.md` · Cambios de alto nivel por release.

## 3) Arquitectura y decisiones

* `/doc/POLICY_INDEX.md` · Este índice.
* `/doc/adr/ADR-TEMPLATE.md` · Plantilla de ADR.
* `/doc/adr/ADR-0001-titulo.md` · Ejemplo.
* `/doc/diagrams/` · Diagramas actualizados por servicio/vista.

## 4) Seguridad y privacidad

* `/doc/security/SECRETS_MANAGEMENT.md` · Gestión de secretos (KMS/Secrets Manager, rotación).
* `/doc/security/ACCESS_CONTROL_POLICY.md` · Roles, RBAC/ABAC, matriz de acceso.
* `/doc/security/CRYPTO_POLICY.md` · Cifrado en tránsito/reposo, algoritmos, rotaciones.
* `/doc/security/PRIVACY_29733.md` · Ley 29733 y derechos ARCO.
* `/doc/security/THREAT_MODEL-<servicio>.md` · Modelo de amenazas por servicio.
* `/doc/security/DATA_RETENTION_POLICY.md` · Retención y borrado seguro.
* `/doc/security/SECURITY_HEADERS_CSP_HSTS.md` · CSP/HSTS y headers mínimos.

## 5) Operación y respuesta

* `/doc/runbooks/INCIDENT_RESPONSE.md` · Proceso de incidentes y comunicación.
* `/doc/runbooks/DISASTER_RECOVERY.md` · DR, RPO/RTO, pruebas de restore.
* `/doc/runbooks/KEY_ROTATION.md` · Rotación/verificación de claves.
* `/doc/runbooks/PAYMENT_WEBHOOKS.md` · Webhooks de pagos seguros.

## 6) Calidad y pruebas

* `/doc/policies/TESTING_STRATEGY.md` · Unit, contract (Pact), E2E (Playwright), carga (k6).
* `/doc/policies/QUALITY_GATES.md` · Umbrales CI (cobertura, p95 en stg, error rate).
* `/qa/k6/LOAD_PROFILES.md` · Perfiles de carga por servicio/flujo.
* `/qa/chaos/CHAOS_EXPERIMENTS.md` · Experimentos de resiliencia y abort criteria.

## 7) APIs y eventos

* `/doc/policies/API_STYLE_GUIDE.md` · REST, errores, paginación, versionado.
* `/doc/policies/OPENAPI_CONVENTIONS.md` · Convenciones OpenAPI, Spectral.
* `/contracts/openapi/` · `*-service.v1.yaml` con ejemplos válidos.
* `/contracts/asyncapi/` · Especificaciones de eventos por dominio.
* `/platform/events/EVENT_NAMING_CONVENTIONS.md` · Nombres, claves, retención.
* `/platform/events/OUTBOX_PATTERN.md` · Outbox, idempotencia, DLQ.

## 8) Plataforma y redes

* `/platform/gateway/README.md` · WAF, CORS, rate-limits, dominios. Solo norte-sur.
* `/platform/mesh/README.md` · mTLS, authZ S2S, retries, circuit breaking, egress.
* `/platform/observability/OBSERVABILITY_POLICY.md` · Logs, métricas, trazas, SLO/SLA.

## 9) Datos y migraciones

* `/doc/policies/DATA_MODELING.md` · Multi-tenant (RLS), partición, índices.
* `/doc/policies/DB_MIGRATIONS.md` · Estrategia expand→migrate→contract y seeds.
* `/doc/policies/PII_MINIMIZATION.md` · Minimización, proyecciones, masking.

## 10) Flags, configuración y entornos

* `/config/README.md` · Jerarquía `dev/stg/prod`, flags, parámetros no sensibles.
* `/doc/policies/FEATURE_FLAGS.md` · Uso de flags y rollout seguro.
* `/infra/terraform/README.md` · Módulos/envs y prácticas de IaC.
* `/infra/cicd/PIPELINES_POLICY.md` · Pipelines, caché, gates, SAST/SCA/secret-scan.

## 11) Creación de nuevos servicios

* `/scripts/templates/service/README.md` · Plantilla estándar.
* `/doc/policies/NEW_SERVICE_CHECKLIST.md` · Checklist de alta (contratos, SLO, seguridad, observabilidad, runbook).

## 12) UI y BFF

* `/apps/web-admin/SECURITY_NOTES.md` · Cookies httpOnly, CSRF, navegación segura.
* `/apps/web-user/SECURITY_NOTES.md` · Reglas de seguridad del portal usuario.
* `/apps/bff/admin/BFF_POLICY.md` · PKCE, shaping, caché corto.
* `/apps/bff/app/BFF_POLICY.md` · Políticas BFF usuario.
* `/apps/bff/mobile/BFF_POLICY.md` · Políticas BFF móvil.

---

## Reglas de mantenimiento del índice

* Actualizar este archivo en cualquier PR que cree, mueva o elimine una política.
* Metadatos mínimos en cada política:

  * `Policy-Version: x.y.z`
  * `Owner: <equipo/persona>`
  * `Effective-Date: YYYY-MM-DD`
  * `Related-ADR: ADR-XXXX`
* Cambios breaking de políticas requieren ADR nuevo o actualizado.
* Enlace bidireccional: cada política enlaza a este índice y este índice enlaza a la política.

## Contactos y ownership

* Propietarios por carpeta en `/.github/CODEOWNERS`.
* Operación: `/doc/runbooks/INCIDENT_RESPONSE.md`.
* Seguridad: `/SECURITY.md` y `/doc/security/SECRETS_MANAGEMENT.md`.
