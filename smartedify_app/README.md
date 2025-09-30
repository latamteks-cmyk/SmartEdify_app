 

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

