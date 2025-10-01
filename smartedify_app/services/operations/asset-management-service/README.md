# 🏗️ SmartEdify Asset Management Service

**Puerto:** 3010 • **Versión:** 1.0.0 • **Estado:** ✅ Producción

Servicio central de SmartEdify para la gestión integral del ciclo de vida de activos (hard y soft), planificación de mantenimiento, gestión de órdenes de trabajo, proveedores e insumos. Integrado con la plataforma SmartEdify para gobernanza, finanzas y operaciones.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [API Documentation](#-api-documentation)
- [Base de Datos](#-base-de-datos)
- [Flujos Operativos](#-flujos-operativos)
- [Eventos](#-eventos)
- [Seguridad](#-seguridad)
- [Observabilidad](#-observabilidad)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contribución](#-contribución)

## 🚀 Características

### Gestión Maestra de Activos
- ✅ **Activos Hard (Técnicos):** Ascensores, bombas, generadores, HVAC, etc.
- ✅ **Activos Soft (Espaciales):** Jardines, lobby, pasillos, áreas comunes
- ✅ Jerarquía: Sistema > Subsistema > Área > Equipo > Componente
- ✅ Ficha técnica completa con garantías y manuales
- ✅ Criticidad A/B/C y estados operacionales
- ✅ Gestión de fotos y documentación

### Planificación de Mantenimiento
- ✅ **Preventivo, Predictivo y Correctivo**
- ✅ Triggers por tiempo, uso o condición (IoT)
- ✅ Planes configurables con checklist y procedimientos
- ✅ Generación automática de propuestas (no OTs directas)
- ✅ Integración con RRHH para disponibilidad de personal
- ✅ Diferenciación técnica vs servicios generales

### Gestión de Incidencias
- ✅ Registro desde múltiples fuentes (app, web, IoT, inspecciones)
- ✅ **Clasificación LLM** con sugerencias automáticas
- ✅ Triage y consolidación de tareas
- ✅ Flujo manual de incidencia → SOS
- ✅ Gestión proactiva del presupuesto

### Órdenes de Trabajo (OT)
- ✅ **Mobile-First & Offline-First** para técnicos
- ✅ Validación de ubicación (QR/GPS)
- ✅ Permisos de trabajo de alto riesgo
- ✅ Registro de insumos diferenciado (técnico vs servicios)
- ✅ Control de calidad y aprobaciones
- ✅ Feedback de residentes

### Gestión de Insumos
- ✅ Inventario simple con stock mínimo
- ✅ Despachos de almacén por trabajador/área
- ✅ **Conciliación por prorrateo** para servicios generales
- ✅ Gestión de variaciones y umbrales
- ✅ Integración con finance-service para costeo

### Gestión de Excepciones
- ✅ OTs de emergencia con post-regularización
- ✅ **Flujo CAPEX** para fallas catastróficas
- ✅ Integración con governance-service para asambleas
- ✅ Consulta automática de fondos de reserva

## 🏗 Arquitectura

### Patrones Arquitectónicos

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │────│ Asset Mgmt API  │────│   PostgreSQL    │
│   (Técnicos)    │    │   (Port 3010)   │    │   + RLS + Redis │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                │
                       ┌─────────────────┐
                       │      Kafka      │
                       │   (Eventos)     │
                       └─────────────────┘
```

### Modelo de Dominio

```
Spaces (Áreas) ──────── (N) Assets (Activos)
     │                        │
     │                        │
     └── (N) MaintenancePlans ┘
              │
              └── (N) Tasks ──── (N) WorkOrders
                    │                  │
                    └── Incidents ─────┘
```

### Stack Tecnológico
- **Framework:** NestJS + TypeScript
- **Base de Datos:** PostgreSQL 15+ con RLS
- **Cache:** Redis + Bull Queue
- **Eventos:** Kafka
- **Observabilidad:** OpenTelemetry + Prometheus + Jaeger
- **Mobile:** Offline-first con sincronización automática
- **Containerización:** Docker + Kubernetes

## 📦 Instalación

### Prerrequisitos
- Node.js 18+
- PostgreSQL 15+
- Redis 6+
- Kafka (opcional para desarrollo)

### Desarrollo Local

```bash
# Clonar el repositorio
git clone <repository-url>
cd smartedify_app/services/operations/asset-management-service

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar migraciones
npm run db:migrate

# Ejecutar seeds (opcional)
npm run db:seed

# Iniciar en modo desarrollo
npm run start:dev
```

### Docker

```bash
# Construir imagen
docker build -t smartedify/asset-management-service:1.0.0 .

# Ejecutar contenedor
docker run -p 3010:3010 \
  -e DB_HOST=localhost \
  -e DB_PASSWORD=postgres \
  -e REDIS_HOST=localhost \
  smartedify/asset-management-service:1.0.0
```

## ⚙️ Configuración

### Variables de Entorno Principales

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto del servicio | `3010` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `REDIS_HOST` | Host de Redis | `localhost` |
| `KAFKA_BROKERS` | Brokers de Kafka | `localhost:9092` |
| `ENABLE_OFFLINE_MODE` | Soporte offline móvil | `true` |
| `ENABLE_LLM_CLASSIFICATION` | Clasificación IA | `true` |
| `MAX_PROVIDERS_PER_SOS` | Máx. proveedores por SOS | `3` |

Ver `.env.example` para la lista completa.

## 📚 API Documentation

### Endpoints Principales

#### Activos
- `POST /api/v1/assets/assets` - Crear activo
- `GET /api/v1/assets/assets` - Listar activos
- `GET /api/v1/assets/assets/{id}` - Obtener activo
- `PATCH /api/v1/assets/assets/{id}` - Actualizar activo
- `POST /api/v1/assets/assets/{id}/photos` - Subir fotos
- `GET /api/v1/assets/assets/{id}/warranty-status` - Estado garantía

#### Espacios
- `POST /api/v1/assets/spaces` - Crear espacio
- `GET /api/v1/assets/spaces` - Listar espacios
- `PATCH /api/v1/assets/spaces/{id}/dimensions` - Actualizar dimensiones
- `GET /api/v1/assets/spaces/{id}/metrics` - Métricas del espacio

#### Incidencias
- `POST /api/v1/assets/incidents` - Reportar incidencia
- `POST /api/v1/assets/incidents/{id}/classify` - Clasificar incidencia
- `GET /api/v1/assets/incidents` - Listar incidencias

#### Tareas
- `GET /api/v1/assets/tasks` - Listar tareas
- `POST /api/v1/assets/tasks/merge` - Consolidar tareas
- `POST /api/v1/assets/tasks/{group_id}/propose-sos` - Proponer SOS

#### Órdenes de Trabajo
- `POST /api/v1/assets/work-orders` - Crear OT
- `GET /api/v1/assets/work-orders` - Listar OTs
- `POST /api/v1/assets/work-orders/{id}/complete` - Completar OT
- `POST /api/v1/assets/work-orders/{id}/approve` - Aprobar OT

#### Planes de Mantenimiento
- `POST /api/v1/assets/maintenance-plans` - Crear plan
- `GET /api/v1/assets/maintenance-plans/{id}/calendar` - Calendario
- `POST /api/v1/assets/maintenance-plans/{id}/activate` - Activar plan

### Documentación Interactiva

Cuando el servicio está ejecutándose:
- **Swagger UI:** http://localhost:3010/api/docs
- **OpenAPI JSON:** http://localhost:3010/api/docs-json

### Ejemplos de Uso

#### Crear Activo Hard
```bash
curl -X POST http://localhost:3010/api/v1/assets/assets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ascensor Principal Torre A",
    "type": "HARD",
    "category": "elevator",
    "criticality": "A",
    "brand": "Otis",
    "model": "Gen2 Premier",
    "warranty_until": "2025-12-31",
    "space_id": "uuid-here"
  }'
```

#### Crear Espacio
```bash
curl -X POST http://localhost:3010/api/v1/assets/spaces \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lobby Principal Torre A",
    "category": "lobby",
    "usable_floor_area_m2": 150.5,
    "perimeter_m": 48.0,
    "wall_height_m": 3.2,
    "complexity": "M"
  }'
```

#### Reportar Incidencia
```bash
curl -X POST http://localhost:3010/api/v1/assets/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Ascensor no funciona",
    "description": "El ascensor no responde al presionar botones",
    "priority": "HIGH",
    "source": "RESIDENT_APP",
    "asset_id": "uuid-here",
    "evidence": [
      {
        "type": "image",
        "url": "https://cdn.smartedify.com/incident-photo.jpg"
      }
    ]
  }'
```

## 🗄 Base de Datos

### Esquema Principal

El servicio utiliza PostgreSQL con Row Level Security (RLS) para multi-tenancy:

#### Tablas Principales
- **`spaces`** - Áreas y superficies con cálculos automáticos
- **`assets`** - Activos hard y soft con metadatos
- **`maintenance_plans`** - Planes de mantenimiento configurables
- **`incidents`** - Incidencias con clasificación LLM
- **`tasks`** - Tareas generadas y consolidadas
- **`work_orders`** - Órdenes de trabajo con seguimiento completo
- **`consumables`** - Inventario de insumos
- **`warehouse_dispatches`** - Despachos de almacén
- **`consumption_variances`** - Variaciones de consumo

#### Características Avanzadas
- **RLS activo** en todas las tablas por `tenant_id`
- **Triggers automáticos** para `updated_at`
- **Campos calculados** (wall_area_m2, deltas)
- **Funciones de negocio** (numeración OT, próxima ejecución)
- **Audit trail** opcional para trazabilidad

### Migraciones

```bash
# Ejecutar migraciones
npm run db:migrate

# Revertir última migración
npm run db:migrate:revert

# Crear nueva migración
npm run typeorm migration:create -- -n MigrationName
```

## 🔄 Flujos Operativos

### Flujo 1: Reporte y Triaje de Incidencia
1. **Residente** reporta problema vía app
2. **Sistema** crea incidencia y notifica administrador
3. **LLM** sugiere clasificación automática
4. **Administrador** clasifica y decide tipo de tarea
5. **Sistema** genera tareas según clasificación

### Flujo 2: Mantenimiento Preventivo
1. **Sistema** activa plan por trigger (tiempo/uso/condición)
2. **Sistema** genera propuesta de OT (no automática)
3. **Administrador** revisa y aprueba propuesta
4. **Sistema** asigna a técnico disponible
5. **Técnico** ejecuta offline y sincroniza

### Flujo 3: Gestión de SOS
1. **Administrador** consolida tareas y propone SOS
2. **Sistema** sugiere hasta 3 proveedores calificados
3. **Administrador** edita lista y envía invitaciones
4. **Proveedores** envían ofertas
5. **Sistema** consulta impacto presupuestario
6. **Administrador** adjudica y genera OC + OT

### Flujo 4: Ejecución Mobile Offline
1. **Técnico** descarga OTs para su jornada
2. **Técnico** valida ubicación (QR/GPS)
3. **Técnico** completa checklist de seguridad si aplica
4. **Técnico** ejecuta trabajo offline
5. **Técnico** registra insumos y fotos
6. **App** sincroniza automáticamente al recuperar conexión

### Flujo 5: Conciliación de Insumos
1. **Sistema** ejecuta batch de conciliación periódico
2. **Sistema** cruza despachos con OTs de servicios
3. **Sistema** prorratea consumo por área/tiempo
4. **Sistema** identifica variaciones significativas
5. **Administrador** revisa y aprueba variaciones
6. **Sistema** publica asientos a finance-service

## 📡 Eventos

### Eventos Emitidos

| Evento | Descripción | Payload |
|--------|-------------|---------|
| `AssetCreated` | Activo creado | `{asset_id, type, category, criticality}` |
| `AssetUpdated` | Activo actualizado | `{asset_id, changes}` |
| `SpaceCreated` | Espacio creado | `{space_id, category, total_area}` |
| `SpaceDimensionsUpdated` | Dimensiones actualizadas | `{space_id, dimensions}` |
| `IncidentCreated` | Incidencia reportada | `{incident_id, priority, source}` |
| `IncidentClassified` | Incidencia clasificada | `{incident_id, task_type, classification}` |
| `WorkOrderCreated` | OT creada | `{work_order_id, type, priority, assigned_to}` |
| `WorkOrderCompleted` | OT completada | `{work_order_id, duration, report}` |
| `MaintenancePlanActivated` | Plan activado | `{plan_id, next_execution}` |

### Formato de Eventos

```json
{
  "event_id": "evt_1234567890_abc123",
  "tenant_id": "uuid",
  "asset_id": "uuid",
  "occurred_at": "2023-12-01T10:00:00Z",
  "trace_id": "trace_xyz789",
  "payload": { ... }
}
```

## 🔒 Seguridad

### Autenticación y Autorización
- JWT ES256/EdDSA con validación de `kid`
- DPoP para operaciones de escritura
- mTLS para comunicación service-to-service

### Multi-tenancy
- Row Level Security (RLS) en PostgreSQL
- Aislamiento por `tenant_id` en todas las operaciones
- Validación de contexto de tenant en cada request

### Seguridad Mobile
- Validación de ubicación obligatoria
- Checklist de seguridad para trabajos de alto riesgo
- Sincronización segura con manejo de conflictos

### Headers de Seguridad
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options, X-Content-Type-Options

## 📊 Observabilidad

### Métricas (Prometheus)

```
# Métricas de negocio
assets_total{tenant,type,category,criticality}
maintenance_plans_due{tenant}
work_orders_total{tenant,status,type,priority}
incidents_total{tenant,priority,source}
consumables_variance_rate{tenant}
clean_time_min_total{tenant,space_category}

# Métricas técnicas
http_requests_total{method,status,endpoint}
http_request_duration_seconds{method,endpoint}
database_connections_active
redis_operations_total{operation}
offline_sync_operations_total{status}
```

### Trazas (OpenTelemetry)
- Instrumentación automática HTTP/Express/PostgreSQL/Redis
- Contexto de tenant en todos los spans
- Trazas de flujos offline y sincronización
- Propagación de trace_id en eventos Kafka

### Logs Estructurados
```json
{
  "timestamp": "2023-12-01T10:00:00Z",
  "level": "info",
  "message": "Work order completed",
  "tenant_id": "uuid",
  "work_order_id": "uuid",
  "asset_id": "uuid",
  "duration_minutes": 120,
  "trace_id": "trace_xyz",
  "service": "asset-management-service"
}
```

### Health Checks
- `/api/v1/assets/health` - Comprehensive health check
- `/api/v1/assets/health/liveness` - Kubernetes liveness probe
- `/api/v1/assets/health/readiness` - Kubernetes readiness probe

## 🚀 Deployment

### Kubernetes

```bash
# Aplicar manifiestos
kubectl apply -f deployments/kubernetes.yaml

# Verificar deployment
kubectl get pods -l app=asset-management-service -n smartedify

# Ver logs
kubectl logs -f deployment/asset-management-service -n smartedify
```

### Configuración de Producción

#### Recursos Recomendados
- **CPU:** 500m request, 1000m limit
- **Memory:** 512Mi request, 1Gi limit
- **Replicas:** 3 mínimo, 15 máximo
- **HPA:** CPU 70%, Memory 80%

#### Dependencias Externas
- PostgreSQL con RLS habilitado
- Redis para cache y colas
- Kafka para eventos
- Servicios SmartEdify (identity, tenancy, finance, etc.)

### Monitoreo de Producción

#### SLIs/SLOs
- **Availability:** 99.9% uptime
- **Latency:** P95 < 300ms, P99 < 1s
- **Error Rate:** < 0.1%
- **Throughput:** 2000 RPS sostenido
- **Offline Sync:** 99% éxito en 30s

#### Alertas Críticas
- Pod restart rate > 5/hour
- Database connection pool exhaustion
- Redis connectivity issues
- High memory usage (>90%)
- Work order SLA breaches
- Maintenance plan overdue

## 🧪 Testing

### Ejecutar Tests

```bash
# Tests unitarios
npm run test

# Tests con cobertura
npm run test:cov

# Tests E2E
npm run test:e2e

# Tests en modo watch
npm run test:watch
```

### Cobertura Objetivo
- **Líneas:** ≥ 80%
- **Funciones:** ≥ 85%
- **Branches:** ≥ 75%

### Tests E2E Incluidos
- ✅ Gestión completa de activos
- ✅ Flujos de mantenimiento preventivo
- ✅ Clasificación de incidencias
- ✅ Consolidación de tareas
- ✅ Ejecución de órdenes de trabajo
- ✅ Conciliación de insumos
- ✅ Health checks
- ✅ Manejo de errores RFC 7807

## 🤝 Contribución

### Flujo de Desarrollo

1. **Fork** del repositorio
2. **Crear** rama feature: `git checkout -b feature/nueva-funcionalidad`
3. **Commit** cambios: `git commit -am 'Add nueva funcionalidad'`
4. **Push** a la rama: `git push origin feature/nueva-funcionalidad`
5. **Crear** Pull Request

### Estándares de Código

```bash
# Linting
npm run lint

# Formateo
npm run format

# Pre-commit hooks
npm run pre-commit
```

### Convenciones
- **Commits:** Conventional Commits
- **Branches:** `feature/`, `bugfix/`, `hotfix/`
- **PR:** Template obligatorio con checklist
- **Code Review:** Mínimo 2 aprobaciones

## 📞 Soporte

### Contactos
- **Equipo:** Operations Services Team
- **Slack:** #operations-services
- **Email:** operations-services@smartedify.com

### Documentación Adicional
- [Especificación Técnica](../../referencias/asset-management-service.md)
- [OpenAPI Contract](../../contracts/openapi/asset-management-service.v1.yaml)
- [Runbooks](../../doc/runbooks/)
- [ADRs](../../doc/adr/)

### Troubleshooting

#### Problemas Comunes

**Error de conexión a Redis**
```bash
# Verificar conectividad
kubectl exec -it deployment/asset-management-service -- nc -zv redis-master 6379

# Verificar credenciales
kubectl get secret asset-management-service-secrets -o yaml
```

**Sincronización offline fallando**
```bash
# Verificar logs de sincronización
kubectl logs -f deployment/asset-management-service | grep "sync"

# Verificar métricas de sync
curl http://localhost:3010/metrics | grep offline_sync
```

**RLS no funciona**
```sql
-- Verificar configuración RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'assets';
```

---

**Versión:** 1.0.0 • **Última actualización:** Septiembre 2025 • **Licencia:** Propietaria SmartEdify