<<<<<<< HEAD
# Services

Este directorio contiene todos los microservicios del sistema SmartEdify, organizados por líneas funcionales según el SCOPE v2.0:

## Estructura

- `core/` - Servicios fundamentales (identidad, perfiles, tenancy, notificaciones, documentos)
- `governance/` - Servicios de gobernanza (asambleas, streaming, compliance, reservas)
- `operations/` - Servicios operativos (finanzas, activos, seguridad, nómina, RRHH)
- `business/` - Servicios de negocio (marketplace, analytics)

## Servicios por Puerto

### Core (3001-3006)
- `identity-service` (3001) - Gestión de identidad, JWT, RBAC/ABAC
- `user-profiles-service` (3002) - Perfiles de usuario, roles por condominio
- `tenancy-service` (3003) - Ciclo de vida de condominios, alícuotas
- `notifications-service` (3005) - Email, SMS, push, Event Schema Registry
- `documents-service` (3006) - Gestión documental, firma electrónica

### Governance (3011-3014)
- `governance-service` (3011) - Asambleas, votación, actas con IA
- `compliance-service` (3012) - Motor normativo global, validaciones
- `reservation-service` (3013) - Reservas de áreas comunes
- `streaming-service` (3014) - Video en vivo, QR, transcripción

### Operations (3004, 3007-3010)
- `physical-security-service` (3004) - CCTV, control accesos, IoT
- `finance-service` (3007) - Cuotas, conciliación, PCGE/NIIF
- `payroll-service` (3008) - Nóminas, PLAME, beneficios
- `hr-compliance-service` (3009) - Ciclo empleado, SST, contratos
- `asset-management-service` (3010) - Inventario, mantenimiento, proveedores

### Business (3015-3016)
- `marketplace-service` (3015) - Ecosistema servicios premium
- `analytics-service` (3016) - BI, dashboards, ML predictivo

## Convenciones Clave

- **Un servicio = su propio Postgres, openapi/, db/migrations/, deployments/, tests/**
- **Eventos versionados**: todos los eventos se definen y versionan en `platform/events/` (AsyncAPI, Avro/JSON Schema)
- **BFF**: Termina PKCE y oculta refresh tokens. Las UIs consumen solo el BFF, nunca servicios directos
- **Tráfico**: `platform/mesh` gobierna tráfico este-oeste (servicio a servicio); Gateway solo norte-sur (cliente a backend)
- **ADR**: Toda decisión arquitectónica relevante se documenta en `doc/adr/`

## Buenas Prácticas

Cada servicio debe tener:
- `src/` para código fuente
- `openapi/` para contratos REST
- `db/migrations/` para migraciones de base de datos
- `deployments/` para manifiestos ECS/K8s
- `tests/` para unitarios, contract y e2e

### Seguridad
- JWT asimétrico (ES256/EdDSA), OIDC PKCE, RBAC/ABAC
- Cifrado TLS 1.3, auditoría inmutable
- Todos los tokens DEBEN incluir `kid` en el header

### Observabilidad
- Logs estructurados, métricas, trazas distribuidas (OpenTelemetry)
- >80% cobertura de pruebas, E2E para flujos críticos

## Referencias

=======
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
>>>>>>> origin/main
- Estructura de referencia: ver README global y SCOPE.md
- ADRs: `doc/adr/`
- Contratos: `contracts/openapi/`, `contracts/asyncapi/`
- Eventos: `platform/events/`
- Seguridad: `platform/security/`
- Observabilidad: `platform/observability/`

---

> Para cambios estructurales, breaking o nuevas integraciones, documentar en ADR y actualizar contratos antes de mergear a main.
<<<<<<< HEAD

Cada servicio es independiente, con su propia base de datos y ciclo de despliegue.
=======
>>>>>>> origin/main
