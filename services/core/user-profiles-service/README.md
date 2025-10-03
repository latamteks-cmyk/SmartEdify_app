# User Profiles Service

> **Policy-Version:** 2.1  
> **Owner:** Core Team  
> **Effective-Date:** 2025-09-30  
> **Related-ADR:** ADR-0002-user-profiles  
> **Puerto:** 3002

## Visión

Fuente **canónica** de perfiles de usuario, membresías, roles locales y entitlements. Gestiona relaciones persona ↔ unidad (propietario, arrendatario, conviviente, staff, proveedor) y exposición de permisos efectivos vía PDP (`compliance-service`).

## Alcance y Responsabilidades

### ✅ Dentro del Alcance
- **CRUD de perfiles** por tenant con validación de integridad
- **Ciclo de vida de membresías** en condominios/unidades
- **Definición de roles locales** (plantillas por país + catálogo por condominio)
- **Gestión de entitlements** modulares por servicio contratado
- **Exposición de permisos efectivos** (`/evaluate`) integrando con PDP
- **Soporte completo** a Arrendatario y Conviviente con responsable y reglas de voz/voto
- **Manejo de consents** y cumplimiento de DSAR
- **Emisión de eventos** para sincronización cross-service

### ❌ Fuera del Alcance
- **Autenticación** ni emisión de tokens → `identity-service`
- **Definición de reglas legales** → delega en `compliance-service`
- **Lógica de negocio** de otros dominios (finanzas, governance, etc.)

## Modelo de Negocio

### Tipos de Relación
- **OWNER**: Propietario, siempre vinculado a `unit_id(kind='PRIVATE')`
- **TENANT (ARRENDATARIO)**: Responsable = propietario; `voice=true`, `vote=false` salvo delegación válida
- **CONVIVIENTE**: Responsable = arrendatario/propietario; permisos = reportar, reservar, redirigir notificaciones
- **STAFF**: Personal interno con permisos operativos
- **PROVIDER**: Actor externo, vinculado a contratos/OTs
- **VISITOR**: Temporal, TTL definido

### Multi-Tenancy
- `tenant_id` = **cliente SaaS** (administradora o junta de propietarios)
- `condominium_id` = condominio dentro del tenant
- **RLS** en todas las tablas por `tenant_id`; consultas por `condominium_id` donde aplique

## API Endpoints

### Perfiles
- `GET /me` → perfil + membresías + roles + entitlements
- `GET /profiles/{id}` → perfil específico
- `POST /profiles` → crear perfil (ADMIN)
- `PATCH /profiles/{id}` → actualizar perfil
- `POST /profiles/{id}:activate|:lock|:unlock|:deactivate` → cambios de estado

### Membresías
- `GET /profiles/{id}/memberships` → listar membresías
- `POST /profiles/{id}/memberships` → crear membresía
- `PATCH /memberships/{id}` → actualizar membresía
- `POST /memberships/{id}:terminate|:transfer` → operaciones especiales
- `PUT /memberships/{id}/tenant-config` → configurar arrendatario/conviviente

### Roles y Permisos
- `GET /roles?condominium_id=...` → roles disponibles
- `PUT /profiles/{id}/roles` → asignar/revocar roles
- `POST /evaluate` → evaluar permisos efectivos (integra PDP + cache)

### Catálogo
- `GET /catalog/templates?country=PE` → plantillas de roles por país
- `PUT /catalog/condominiums/{id}/activate-template/{template_id}` → activar plantilla
- `POST /catalog/custom-roles` → crear rol personalizado

### Entitlements
- `GET /profiles/{id}/entitlements` → listar entitlements
- `POST /profiles/{id}/entitlements:grant|:revoke` → gestionar entitlements

### Operaciones Masivas
- `POST /bulk/validate` → validar operación bulk
- `POST /bulk/execute` → ejecutar operación bulk (máx 10k filas/job)
- `GET /exports?format=csv|json` → exportar datos

### Privacidad
- `GET /profiles/{id}/consents` → obtener consents de comunicación
- `PUT /profiles/{id}/consents` → actualizar consents
- `POST /privacy/data` → solicitud DSAR (proxy a Identity/Compliance)

## Modelo de Datos

### Tablas Principales
```sql
-- Perfiles (fuente canónica)
user_profiles.profiles (id, tenant_id, email, full_name, status, ...)

-- Membresías (relaciones persona ↔ unidad)
user_profiles.memberships (id, profile_id, condominium_id, unit_id, relation, privileges, ...)

-- Roles por condominio
user_profiles.roles (id, condominium_id, name, permissions, ...)

-- Asignaciones de rol
user_profiles.role_assignments (id, profile_id, role_id, granted_at, revoked_at, ...)

-- Entitlements modulares
user_profiles.profile_entitlements (id, profile_id, service_code, entitlement_key, ...)

-- Consents de comunicación
user_profiles.communication_consents (id, profile_id, channel, purpose, allowed, ...)

-- Historial (particionado por mes)
user_profiles.profile_history (id, profile_id, event_type, data, ts, ...)
user_profiles.membership_history (id, membership_id, event_type, data, ts, ...)
```

### Constraints Clave
- **RLS activo** en todas las tablas por `tenant_id`
- **responsible_profile_id** debe pertenecer al mismo `condominium_id` con relation ∈ {OWNER,TENANT}
- **unit_id** con `kind='COMMON'` no admite membresías
- **Soft delete** con `deleted_at`, DSAR aplica `crypto-erase`

## Integraciones

### Dependencias Upstream
- **identity-service**: Validación JWT, contexto de usuario
- **compliance-service**: PDP para evaluación de permisos, políticas legales
- **tenancy-service**: Validación de `condominium_id` y `unit_id`

### Dependencias Downstream
- **governance-service**: Consume perfiles para asambleas y votaciones
- **finance-service**: Consume membresías para cálculo de cuotas
- **notifications-service**: Consume consents para envío de notificaciones

### Eventos Emitidos (Kafka)
```json
{
  "event_type": "UserProfileCreated|Updated|StatusChanged",
  "tenant_id": "uuid",
  "condominium_id": "uuid", 
  "profile_id": "uuid",
  "actor": "uuid",
  "trace_id": "string",
  "data": { ... }
}
```

## Seguridad

### Autenticación y Autorización
- **JWT ES256/EdDSA** con `kid` obligatorio, validación en gateway
- **DPoP obligatorio** en operaciones de escritura (RFC 9449)
- **mTLS interno** con SPIFFE/SPIRE para comunicación service-to-service

### Protección de Datos
- **RLS activo** en todas las tablas por `tenant_id`
- **Logs WORM** con mascarado de PII automático
- **Crypto-erase** para cumplimiento DSAR
- **Input validation** estricta (email RFC5322, phone E.164, full_name ≤140)

## Observabilidad

### Métricas (Prometheus)
```
# Métricas de negocio
profiles_active{tenant,condominium} - Perfiles activos
memberships_active{relation} - Membresías por tipo de relación
evaluate_latency_seconds_bucket - Latencia de evaluación de permisos

# Métricas técnicas  
policy_cache_hits_total - Cache hits del PDP
pdp_fail_closed_total - Fallos cerrados del PDP
bulk_jobs_running_total - Jobs bulk en ejecución
exports_generated_total - Exports generados
```

### Trazas (OpenTelemetry)
- Incluyen `tenant_id`, `condominium_id`, `policy_id/version`
- Propagación de contexto cross-service
- Correlación con eventos de auditoría

### Logs (JSON Estructurado)
- **Cambios de estado** con diffs y `actor`
- **Evaluaciones de permisos** con resultado y razón
- **Operaciones bulk** con progreso y errores
- **PII mascarado** automáticamente

## Performance y SLOs

### Targets de Latencia
- `GET /me` y `GET /{id}` → P95 ≤ 120ms
- `POST /evaluate` → P95 ≤ 150ms  
- Búsquedas → P95 ≤ 200ms
- Error 5xx < 0.5% mensual

### Optimizaciones
- **Cache distribuido** (Redis) para evaluaciones de permisos
- **Índices optimizados** para consultas multi-tenant
- **Particionado** de tablas de historial por mes
- **Connection pooling** y **prepared statements**

## Operación

### Idempotencia y Concurrencia
- `Idempotency-Key` en POST críticos
- **Optimistic locking** en `profiles` y `memberships`
- **Transacciones** para operaciones multi-tabla

### Límites Operacionales
- **Bulk operations**: máx 10k filas/job, 5 jobs concurrentes/tenant
- **Exports**: máx 10/min por tenant
- **PDP cache**: TTL 5min, invalidación por cambios de política

### Migraciones
- Estrategia **expand→migrate→contract**
- **Zero-downtime** deployments
- **Rollback** automático en caso de falla

## Testing

### Cobertura Requerida
- **Unit tests**: ≥80% cobertura
- **Integration tests**: Todos los endpoints críticos
- **Contract tests**: Pact con servicios dependientes
- **E2E tests**: Flujos completos de usuario

### Tests Específicos
- **RLS multi-tenant**: Aislamiento por `tenant_id`
- **Matriz país×condominio**: Validación contra PDP
- **Chaos testing**: Latencia/fallas del PDP validando `fail-closed`
- **PII redaction**: Validación en logs/exports

## Deployment

### Configuración
```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-profiles-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: user-profiles-service
        image: smartedify/user-profiles-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: user-profiles-db
              key: url
        - name: REDIS_URL
          value: "redis://redis-cluster:6379"
        - name: COMPLIANCE_SERVICE_URL
          value: "http://compliance-service:3012"
```

### Health Checks
- **Liveness**: `GET /health/live` → DB connection
- **Readiness**: `GET /health/ready` → DB + Redis + compliance-service
- **Startup**: `GET /health/startup` → Migraciones completadas

## Checklist de Entrega (DoD)

- [ ] **Esquema desplegado** con RLS habilitado
- [ ] **OpenAPI 3.1** publicado con ejemplos completos
- [ ] **Tests unitarios+integración** ≥80% cobertura
- [ ] **Pruebas de RLS** multi-tenant validadas
- [ ] **Matriz país×condominio** validada contra PDP
- [ ] **Chaos test PDP** (latencia/fallas) validando `fail-closed`
- [ ] **Validación de redacción PII** en logs/exports
- [ ] **Dashboards RED** disponibles en Grafana
- [ ] **Alertas configuradas** para SLOs críticos
- [ ] **Runbook operacional** documentado

## Referencias

- [Contrato OpenAPI](../../../contracts/openapi/user-profiles-service.v1.yaml)
- [Migraciones DB](./db/migrations/)
- [Tests](./tests/)
- [Deployment](./deployments/)
- [Política principal](../../../doc/POLICY_INDEX.md)
- [ADR relevante](../../../doc/adr/ADR-0002-user-profiles.md)
- [Diagramas](../../../doc/diagrams/user-profiles-arch.md)
- [Runbook](../../../doc/runbooks/user-profiles-incident.md)
- [Seguridad](../../../doc/security/THREAT_MODEL-user-profiles.md)
##
 🚀 Estado Actual de Implementación

> **Estado:** 🚧 **75% Implementado**  
> **Última Actualización:** 2025-01-01  
> **Próximo Hito:** 100% funcional para integración

### ✅ Completado (75%)
- **Estructura NestJS completa** con módulos principales
- **Controladores y servicios** implementados para profiles
- **Contratos OpenAPI** completos con 40+ endpoints documentados
- **Configuración Docker/K8s** production-ready con HPA y PDB
- **Observabilidad** configurada (métricas Prometheus, logs, trazas)
- **Esquema de base de datos** PostgreSQL con RLS definido
- **Tests E2E básicos** con TestContainers

### 🔧 Pendiente Esta Semana (25% restante)
- **Base de datos PostgreSQL** - Ejecutar migraciones y configurar RLS
- **Cache Redis** - Para evaluación de permisos con TTL 5min
- **Módulos completos** - Membresías, roles y entitlements faltantes
- **Integración PDP** - Con compliance-service para evaluación de permisos
- **Tests unitarios** - Cobertura ≥80% y tests de integración

### 📋 Próximos Pasos Inmediatos
```bash
cd smartedify_app/services/core/user-profiles-service

# 1. Configurar base de datos
npm install
cp .env.example .env
npm run db:migrate

# 2. Implementar cache Redis para permisos
# 3. Completar módulos de membresías y roles
# 4. Integrar con compliance-service PDP
# 5. Tests y validación multi-tenant
```

### 🔗 Dependencias
- **compliance-service** (85% ✅) - Para evaluación de permisos PDP
- **identity-service** (100% ✅) - Para validación JWT
- **tenancy-service** (100% ✅) - Para validación condominium_id/unit_id

### 🎯 Valor Entregado
El `user-profiles-service` tiene una **base arquitectónica sólida** implementada y está **listo para completar** la funcionalidad restante. La integración con compliance-service PDP permitirá evaluación de permisos granular y contextual según las reglas de cada país. 🚀