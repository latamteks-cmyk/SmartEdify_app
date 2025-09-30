# Convenciones y Buenas Prácticas de Servicios SmartEdify

## Estructura y Agrupación
  - `pmv/`: servicios núcleo cercanos al frontend (ej. assembly-service, reservation-service, asset-management-service, streaming-service)
  - `support/`: soporte al PMV (ej. identity-service, user-profiles-service, tenancy-service, documents-service, notifications-service, finance-service, physical-security-service)
  - `complementary/`: servicios complementarios (ej. compliance-service, payroll-service, hr-compliance-service, marketplace-service, analytics-service)
# services/

Contiene todos los microservicios de la plataforma SmartEdify, agrupados por dominio de negocio:

- pmv/: Servicios principales (assembly, reservation, maintenance)
- support/: Servicios fundacionales (auth, user, tenants, document, communication, finance)
- complementary/: Servicios complementarios (payments, compliance, payroll, certification, support-bot, facility-security)

Consulta las políticas y convenciones globales en [doc/POLICY_INDEX.md](../doc/POLICY_INDEX.md).

## Convenciones Clave
- **Un servicio = su propio Postgres, openapi/, db/migrations/, deployments/, tests/.**
- **Eventos versionados**: todos los eventos se definen y versionan en `platform/events/` (AsyncAPI, Avro/JSON Schema). Contratos sincronizados vía CI.
- **BFF**: Termina PKCE y oculta refresh tokens. Las UIs consumen solo el BFF, nunca servicios directos.
- **Tráfico**: `platform/mesh` gobierna tráfico este-oeste (servicio a servicio); Gateway solo norte-sur (cliente a backend).
- **ADR**: Toda decisión arquitectónica relevante se documenta en `doc/adr/`. Cambios breaking requieren ADR y versión de contrato.

## Buenas Prácticas
- Cada servicio debe tener:
  - `src/` para código fuente
  - `openapi/` para contratos REST
  - `db/migrations/` para migraciones de base de datos
  - `deployments/` para manifiestos ECS/K8s
  - `tests/` para unitarios, contract y e2e
- Contratos OpenAPI y AsyncAPI deben estar sincronizados con `contracts/` y validados en CI.
- Los eventos deben ser versionados y publicados en `platform/events/`.
- Seguridad: JWT asimétrico, OIDC PKCE, RBAC/ABAC, cifrado TLS 1.3, auditoría inmutable.
- Observabilidad: logs estructurados, métricas, trazas distribuidas (OpenTelemetry).
- Feature flags y secrets gestionados en `config/` y `secrets/`.
- Pruebas: >80% cobertura, E2E para flujos críticos.

## Referencias
- Estructura de referencia: ver README global y SCOPE.md
- ADRs: `doc/adr/`
- Contratos: `contracts/openapi/`, `contracts/asyncapi/`
- Eventos: `platform/events/`
- Seguridad: `platform/security/`
- Observabilidad: `platform/observability/`

---

> Para cambios estructurales, breaking o nuevas integraciones, documentar en ADR y actualizar contratos antes de mergear a main.
