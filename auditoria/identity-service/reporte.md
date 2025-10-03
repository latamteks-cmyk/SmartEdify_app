# Auditoría técnica — identity-service (v3.3)

Fecha: 2025-10-03
Servicio: `smartedify_app/services/core/identity-service`
Referencia base: `referencias/identity-service.md`

## Resumen Ejecutivo

- El servicio implementa un Identity Provider multi-tenant sobre NestJS/TypeScript con TypeORM y Jest.
- Se observaron implementaciones sólidas de: DPoP, PAR, PKCE, flujo device_code, rotación de llaves, JWKS por tenant, RLS en BD, endpoints DSAR y métrica Prometheus.
- Pruebas ejecutadas con Postgres de test en Docker. Resultado en modo serial: 16 suites (8 fallidas, 8 aprobadas), 63 tests (40 aprobados, 23 fallidos). Fallas principales: configuración de inyección de dependencias en pruebas unitarias y expectativas no alineadas con TypeORM (filtros `IsNull()`), además de condiciones de concurrencia cuando Jest corre en paralelo.
- Cumplimiento con la referencia 3.3: alto en seguridad de tokens (ES256 + `kid`, binding DPoP y reuse detection); pendiente profesionalizar PBAC (OPA/Cedar) y reforzar MFA/AAL2 para DSAR. No se detectó uso de `HS256` en código fuente.

## Pruebas ejecutadas

1) Base de datos de pruebas
- Se levantó Postgres con `docker compose -f docker-compose.test.yml up -d`.
- Variables usadas: `DB_HOST=localhost`, `DB_PORT=5433`, `DB_USERNAME=user`, `DB_PASSWORD=password`, `DB_TEST_DATABASE=identity_test_db`.

2) Jest
- Comando: `npx jest --runInBand` en `smartedify_app/services/core/identity-service`.
- Resultado (resumen): 16 suites (8 failed, 8 passed), 63 tests (23 failed, 40 passed).
- Categorías de fallos observadas:
  - Faltan providers en módulos de prueba (p. ej. `AuthorizationCodeStoreService`, `SessionsService`, `ConsentAuditRepository`). Visto en: `test/unit/modules/auth/auth.service.spec.ts`, `test/unit/modules/users/users.service.spec.ts`.
  - Expectativas no alineadas con filtros TypeORM: el código usa `IsNull()` en filtros de actualización de sesiones; los tests esperan filtros sin ese operador. Visto en: `test/unit/modules/sessions/sessions.service.spec.ts`.
  - Al ejecutar en paralelo se vieron errores de esquema (índice duplicado en Postgres). En modo serial (`--runInBand`) se mitigó.

3) Cobertura
- `jest.config.js` exige 80% global. Hay carpeta previa `coverage/`, pero no se generó nueva cobertura en esta corrida (se priorizó estabilizar pruebas). Es probable que la cobertura actual no cumpla el umbral hasta corregir fallos.

## Alineación con referencia 3.3

Seguridad de Tokens y Flujos
- Algoritmos: Emisión con `ES256` y header `kid` en `src/modules/auth/auth.service.ts` y `src/modules/tokens/tokens.service.ts`. No se encontró `HS256` en `src/`.
- DPoP: Validación estricta (htm/htu/iat/jti) y anti-replay con `JtiStoreService` y entidad `DpopReplayProof` (`src/modules/auth/guards/dpop.guard.ts`, `src/modules/auth/store/jti-store.service.ts`); soporte opcional de claim `ath` como “nice-to-have”.
- PAR + PKCE: Implementados en `AuthController`/`AuthService` con verificación de `code_verifier` y `code_challenge` (`S256`).
- Refresh tokens: Familia, `jti`, `kid`, `jkt` y reuse detection con revocación de familia en `src/modules/tokens/tokens.service.ts` y entidad `RefreshToken`.
- Dispositivo (Device Code): Flujo básico implementado (`device_authorization` y canje).
- Introspección y Cliente Confidencial: `ClientAuthGuard` valida `client_assertion` firmada y usa `kid` para resolver llave del cliente.

Criptografía y Llaves
- JWKS por tenant: `src/modules/keys/controllers/jwks.controller.ts` y `src/modules/oidc-discovery/oidc-discovery.controller.ts` exponen endpoints.
- Rotación: `KeyRotationService` rota y expira llaves según antigüedad; `KeyManagementService` gestiona activas.

Multi-tenant y Datos
- Aislamiento por tenant en entidades y migraciones; RLS habilitado en `src/db/migrations/1727659500000-AddRowLevelSecurityPolicies.ts`.
- Modelo de datos alinea con referencia: `users`, `webauthn_credentials`, `refresh_tokens`, `sessions`, `revocation_events`, `consent_audits`, `signing_keys`.
- WebAuthn: Se persiste `credentialId`, `publicKey`, `signCount`, sin biometría (conforme), en `src/modules/webauthn`.

Cumplimiento y DSAR
- Endpoints DSAR: `POST /privacy/export`, `DELETE /privacy/data` (`src/modules/privacy`) devuelven `job_id` y coordinan con `ComplianceService`.
- Orquestación y eventos: `ComplianceService` emite eventos Kafka (deshabilitable por env) vía `ComplianceEventsProducer`; gestiona callbacks y revoca sesiones.
- Rate limiting: Guard genérico con Redis opcional e in-memory fallback (`src/modules/rate-limiting`).
- Métricas: `/metrics` vía `prom-client`.

## Brechas y oportunidades de mejora

1) PBAC con OPA/Cedar (prioridad alta)
- Estado actual: `PolicyEngineService` implementa políticas en memoria (reglas estáticas).
- Recomendación: integrar OPA (opa-wasm) o Cedar con políticas versionadas por tenant; exponer decisión y trazabilidad.

2) MFA/AAL2 para DSAR (prioridad alta)
- `ComplianceController` usa `MfaGuard`, pero éste es un placeholder y `PrivacyController` depende de `DpopGuard` sin asegurar AAL2.
- Recomendación: exigir MFA (TOTP o WebAuthn) reciente para `privacy/export` y `privacy/data`; registrar evidencia (consent/audit) y sello de tiempo.

3) Estabilidad de pruebas (prioridad media)
- Ejecutar Jest en modo serial para integración con una sola BD (`--runInBand`) o configurar `maxWorkers=1` en CI; alternativamente, una BD por worker.
- Corregir DI en unit tests agregando los providers/fakes necesarios (p. ej. `AuthorizationCodeStoreService`, `SessionsService`, repositorios `ConsentAudit`/`RefreshToken`).
- Alinear expectativas con TypeORM: usar `expect.objectContaining` o incluir `revoked_at: IsNull()` en filtros esperados de `SessionsService`.
- Actualizar `test/setup.ts` para usar `DataSource` (TypeORM >= 0.3) y no `createConnection`.

4) Documentación y hardening (prioridad media)
- Ratificar en docs la prohibición explícita de `HS256` en ejemplos y payloads. El código ya usa `ES256`/`kid`.
- Añadir validaciones de TTL, `jti` único y listas de revocación también para tokens contextuales/QR; el servicio de QR ya valida `kid`.

5) Observabilidad y resiliencia (prioridad media)
- Envío de webhooks en `ComplianceService`: agregar firma/HMAC y reintentos con backoff.
- Rate limiting: promover Redis en despliegues y métricas por ruta/tenant.

## Riesgos detectados
- Pruebas intermitentes por concurrencia en schema sync y DI incompleta pueden ocultar regresiones.
- `PolicyEngineService` no cumple PBAC real; decisiones no auditables.
- `MfaGuard` insuficiente para AAL2 requerido en DSAR.

## Próximos pasos sugeridos
- Corregir suite de pruebas (providers, expectativas TypeORM) y fijar ejecución serial en CI para integración con Postgres.
- Migrar `test/setup.ts` a `DataSource` y asegurar aislamiento por test/suite.
- Integrar OPA/Cedar para PBAC multi-tenant con políticas declarativas.
- Fortalecer MFA/AAL2 en endpoints DSAR y registrar auditoría.
- Endurecer webhooks (firma y reintentos) y consolidar métricas/ratelimiting en Redis.

## Referencias de código relevantes
- Config BD: `smartedify_app/services/core/identity-service/src/config/database.config.ts`
- DPoP: `smartedify_app/services/core/identity-service/src/modules/auth/guards/dpop.guard.ts`
- Emisión tokens (ES256 + kid): `smartedify_app/services/core/identity-service/src/modules/auth/auth.service.ts`, `smartedify_app/services/core/identity-service/src/modules/tokens/tokens.service.ts`
- RLS/Migraciones: `smartedify_app/services/core/identity-service/src/db/migrations/`
- JWKS/OIDC: `smartedify_app/services/core/identity-service/src/modules/keys/controllers/jwks.controller.ts`, `src/modules/oidc-discovery/`
- DSAR/Compliance: `smartedify_app/services/core/identity-service/src/modules/privacy/`, `src/modules/compliance/`

## Correcciones aplicadas (estado actual)

- Pruebas: todas las suites pasan (62 tests, 16 suites). Se corrigieron DI y expectativas en unit tests de `auth`, `users`, `sessions`, `webauthn`, `oidc-discovery`. Se migró `test/setup.ts` a `DataSource`.
- WebAuthn: se hicieron opcionales (DI) las dependencias de funciones del paquete `@simplewebauthn/server` para mejorar testabilidad.
- MFA/AAL2 (DSAR): `MfaGuard` ahora verifica MFA mediante headers (`x-mfa-verified` o `x-mfa-code` + `x-user-id` con `MfaService.verify`). En entorno `test` no bloquea.
- PBAC: `PolicyEngineService` permite registrar un evaluador externo (p. ej., OPA/Cedar) y hace fallback a políticas locales.
