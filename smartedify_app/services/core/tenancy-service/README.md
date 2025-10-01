# 🏢 SmartEdify Tenancy Service

**Puerto:** 3003 • **Versión:** 1.0.0 • **Estado:** ✅ Producción

Servicio core de SmartEdify responsable de la gestión de tenants, condominios, edificios y unidades. Actúa como fuente canónica de la estructura física y organizativa de cada comunidad.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [API Documentation](#-api-documentation)
- [Base de Datos](#-base-de-datos)
- [Eventos](#-eventos)
- [Seguridad](#-seguridad)
- [Observabilidad](#-observabilidad)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contribución](#-contribución)

## 🚀 Características

### Gestión de Tenants
- ✅ Creación y gestión de tenants (ADMINISTRADORA/JUNTA)
- ✅ Estados del ciclo de vida (ACTIVE/SUSPENDED/CANCELLED)
- ✅ Metadatos extensibles por tenant
- ✅ Validación de unicidad por nombre legal

### Gestión de Condominios
- ✅ Registro de condominios por tenant
- ✅ Configuración financiera personalizable
- ✅ Soporte multi-país
- ✅ Estados operacionales

### Gestión de Edificios
- ✅ Estructuras multi-torre
- ✅ Metadatos de construcción
- ✅ Validación de unicidad por condominio

### Gestión de Unidades
- ✅ Unidades privadas y áreas comunes
- ✅ Códigos locales únicos por condominio
- ✅ Configuración de alícuotas
- ✅ Configuración de ingresos para áreas comunes
- ✅ Operaciones bulk con validación
- ✅ 15 tipos de áreas comunes predefinidas

### Características Técnicas
- ✅ Multi-tenancy con Row Level Security (RLS)
- ✅ Eventos Kafka para sincronización
- ✅ API REST con OpenAPI 3.1
- ✅ Validación RFC 7807 para errores
- ✅ Observabilidad completa (métricas, trazas, logs)
- ✅ Health checks para Kubernetes
- ✅ Deployment production-ready

## 🏗 Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│ Tenancy Service │────│   PostgreSQL    │
│   (Port 80/443) │    │   (Port 3003)   │    │   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                │
                       ┌─────────────────┐
                       │      Kafka      │
                       │   (Port 9092)   │
                       └─────────────────┘
```

### Modelo de Dominio

```
Tenant (1) ──────── (N) Condominium (1) ──────── (N) Building
                                    │
                                    └── (N) Unit
```

### Stack Tecnológico
- **Framework:** NestJS + TypeScript
- **Base de Datos:** PostgreSQL 15+ con RLS
- **Eventos:** Kafka
- **Observabilidad:** OpenTelemetry + Prometheus + Jaeger
- **Containerización:** Docker + Kubernetes
- **Documentación:** OpenAPI 3.1 + Swagger

## 📦 Instalación

### Prerrequisitos
- Node.js 18+
- PostgreSQL 15+
- Kafka (opcional para desarrollo)

### Desarrollo Local

```bash
# Clonar el repositorio
git clone <repository-url>
cd smartedify_app/services/core/tenancy-service

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
docker build -t smartedify/tenancy-service:1.0.0 .

# Ejecutar contenedor
docker run -p 3003:3003 \
  -e DB_HOST=localhost \
  -e DB_PASSWORD=postgres \
  smartedify/tenancy-service:1.0.0
```

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto del servicio | `3003` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `smartedify_tenancy` |
| `DB_USERNAME` | Usuario de la base de datos | `postgres` |
| `DB_PASSWORD` | Contraseña de la base de datos | `postgres` |
| `JWT_SECRET` | Secreto para JWT | `dev-secret-key` |
| `KAFKA_BROKERS` | Brokers de Kafka | `localhost:9092` |

Ver `.env.example` para la lista completa.

### Configuración de Base de Datos

```sql
-- Habilitar RLS globalmente
ALTER DATABASE smartedify_tenancy SET row_security = on;

-- Configurar usuario de aplicación
CREATE ROLE tenancy_service WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE smartedify_tenancy TO tenancy_service;
```

## 📚 API Documentation

### Endpoints Principales

#### Tenants
- `POST /api/v1/tenancy/tenants` - Crear tenant
- `GET /api/v1/tenancy/tenants` - Listar tenants
- `GET /api/v1/tenancy/tenants/{id}` - Obtener tenant
- `PATCH /api/v1/tenancy/tenants/{id}` - Actualizar tenant
- `POST /api/v1/tenancy/tenants/{id}/deactivate` - Desactivar tenant

#### Condominios
- `POST /api/v1/tenancy/condominiums` - Crear condominio
- `GET /api/v1/tenancy/condominiums/{id}` - Obtener condominio
- `PATCH /api/v1/tenancy/condominiums/{id}` - Actualizar condominio

#### Edificios
- `POST /api/v1/tenancy/buildings` - Crear edificio
- `GET /api/v1/tenancy/buildings` - Listar edificios
- `PATCH /api/v1/tenancy/buildings/{id}` - Actualizar edificio
- `DELETE /api/v1/tenancy/buildings/{id}` - Eliminar edificio

#### Unidades
- `POST /api/v1/tenancy/units` - Crear unidad
- `GET /api/v1/tenancy/units` - Listar unidades
- `PATCH /api/v1/tenancy/units/{id}` - Actualizar unidad
- `POST /api/v1/tenancy/units/{id}/deactivate` - Desactivar unidad
- `POST /api/v1/tenancy/units/bulk/validate` - Validar creación bulk
- `POST /api/v1/tenancy/units/bulk/execute` - Ejecutar creación bulk

### Documentación Interactiva

Cuando el servicio está ejecutándose:
- **Swagger UI:** http://localhost:3003/api/docs
- **OpenAPI JSON:** http://localhost:3003/api/docs-json

### Ejemplos de Uso

#### Crear Tenant
```bash
curl -X POST http://localhost:3003/api/v1/tenancy/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ADMINISTRADORA",
    "legal_name": "Gestora Inmobiliaria XYZ S.A.C.",
    "country_code": "PE",
    "metadata": {
      "tax_id": "20123456789",
      "contact_email": "admin@gestora.com"
    }
  }'
```

#### Crear Unidad Privada
```bash
curl -X POST http://localhost:3003/api/v1/tenancy/units \
  -H "Content-Type: application/json" \
  -d '{
    "condominium_id": "uuid-here",
    "local_code": "T-101",
    "kind": "PRIVATE",
    "building_id": "uuid-here",
    "aliquot": 0.025,
    "floor": "10",
    "area_m2": 85.5,
    "meta": {
      "rooms": 3,
      "bathrooms": 2,
      "parking_spaces": 1
    }
  }'
```

#### Crear Área Común
```bash
curl -X POST http://localhost:3003/api/v1/tenancy/units \
  -H "Content-Type: application/json" \
  -d '{
    "condominium_id": "uuid-here",
    "local_code": "AC-PISCINA",
    "kind": "COMMON",
    "common_type": "pool",
    "cost_center_id": "CC-001",
    "revenue_cfg": {
      "reservation": {
        "hour_price": 20,
        "currency": "PEN",
        "min_block": 60
      },
      "penalties": {
        "no_show": 15,
        "late_cancel_pct": 50
      }
    }
  }'
```

## 🗄 Base de Datos

### Esquema Principal

```sql
-- Tenants (organizaciones)
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ADMINISTRADORA','JUNTA')),
  legal_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Condominios
CREATE TABLE condominiums (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  address TEXT,
  country_code TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  financial_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Edificios
CREATE TABLE buildings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  condominium_id UUID NOT NULL REFERENCES condominiums(id),
  name TEXT NOT NULL,
  levels INT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, condominium_id, name)
);

-- Unidades
CREATE TABLE units (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  condominium_id UUID NOT NULL REFERENCES condominiums(id),
  local_code TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('PRIVATE','COMMON')),
  common_type TEXT,
  building_id UUID REFERENCES buildings(id),
  aliquot NUMERIC(7,4) DEFAULT 0,
  floor TEXT,
  area_m2 NUMERIC,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_center_id TEXT,
  revenue_cfg JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, condominium_id, local_code)
);
```

### Row Level Security (RLS)

Todas las tablas implementan RLS basado en `tenant_id`:

```sql
-- Ejemplo para tabla units
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY units_tenant_isolation ON units
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Migraciones

```bash
# Ejecutar migraciones
npm run db:migrate

# Revertir última migración
npm run db:migrate:revert

# Crear nueva migración
npm run typeorm migration:create -- -n MigrationName
```

## 📡 Eventos

### Eventos Emitidos

| Evento | Descripción | Payload |
|--------|-------------|---------|
| `TenantCreated` | Tenant creado | `{tenant_id, type, legal_name, country_code}` |
| `TenantUpdated` | Tenant actualizado | `{tenant_id, changes}` |
| `TenantDeactivated` | Tenant desactivado | `{tenant_id}` |
| `UnitCreated` | Unidad creada | `{tenant_id, condominium_id, unit_id, local_code, kind}` |
| `UnitUpdated` | Unidad actualizada | `{tenant_id, condominium_id, unit_id, changes}` |
| `UnitDeactivated` | Unidad desactivada | `{tenant_id, condominium_id, unit_id}` |
| `UnitsBulkCreated` | Unidades creadas en bulk | `{units[]}` |

### Formato de Eventos

```json
{
  "event_id": "evt_1234567890_abc123",
  "tenant_id": "uuid",
  "condominium_id": "uuid",
  "unit_id": "uuid",
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

### Headers de Seguridad
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options, X-Content-Type-Options

### Rate Limiting
- 1000 requests por IP cada 15 minutos
- Configurable por entorno

## 📊 Observabilidad

### Métricas (Prometheus)

```
# Métricas de negocio
units_total{tenant,condo,kind}
common_areas_total{type}
revenue_cfg_updates_total
aliquot_sum_deviation{condo}

# Métricas técnicas
http_requests_total{method,status,endpoint}
http_request_duration_seconds{method,endpoint}
database_connections_active
database_query_duration_seconds
```

### Trazas (OpenTelemetry)
- Instrumentación automática HTTP/Express/PostgreSQL
- Contexto de tenant en todos los spans
- Propagación de trace_id en headers

### Logs Estructurados
```json
{
  "timestamp": "2023-12-01T10:00:00Z",
  "level": "info",
  "message": "Unit created successfully",
  "tenant_id": "uuid",
  "condominium_id": "uuid",
  "unit_id": "uuid",
  "trace_id": "trace_xyz",
  "user_agent": "...",
  "ip": "192.168.1.1"
}
```

### Health Checks
- `/api/v1/tenancy/health` - Comprehensive health check
- `/api/v1/tenancy/health/liveness` - Kubernetes liveness probe
- `/api/v1/tenancy/health/readiness` - Kubernetes readiness probe

## 🚀 Deployment

### Kubernetes

```bash
# Aplicar manifiestos
kubectl apply -f deployments/kubernetes.yaml

# Verificar deployment
kubectl get pods -l app=tenancy-service -n smartedify

# Ver logs
kubectl logs -f deployment/tenancy-service -n smartedify
```

### Configuración de Producción

#### Recursos Recomendados
- **CPU:** 250m request, 500m limit
- **Memory:** 256Mi request, 512Mi limit
- **Replicas:** 3 mínimo, 10 máximo
- **HPA:** CPU 70%, Memory 80%

#### Variables Críticas
```yaml
env:
- name: NODE_ENV
  value: "production"
- name: DB_SSL
  value: "true"
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: tenancy-service-secrets
      key: JWT_SECRET
```

### Monitoreo de Producción

#### SLIs/SLOs
- **Availability:** 99.9% uptime
- **Latency:** P95 < 200ms, P99 < 500ms
- **Error Rate:** < 0.1%
- **Throughput:** 1000 RPS sostenido

#### Alertas Críticas
- Pod restart rate > 5/hour
- Database connection pool exhaustion
- High memory usage (>90%)
- Error rate > 1%

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
- ✅ Creación y gestión de tenants
- ✅ Operaciones CRUD de unidades
- ✅ Validación de reglas de negocio
- ✅ Operaciones bulk
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
- **Equipo:** Core Services Team
- **Slack:** #core-services
- **Email:** core-services@smartedify.com

### Documentación Adicional
- [Especificación Técnica](../../referencias/tenancy-service.md)
- [OpenAPI Contract](../../contracts/openapi/tenancy-service.v1.yaml)
- [Runbooks](../../doc/runbooks/)
- [ADRs](../../doc/adr/)

### Troubleshooting

#### Problemas Comunes

**Error de conexión a base de datos**
```bash
# Verificar conectividad
kubectl exec -it deployment/tenancy-service -- nc -zv postgres-primary 5432

# Verificar credenciales
kubectl get secret tenancy-service-secrets -o yaml
```

**RLS no funciona**
```sql
-- Verificar configuración RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'units';
```

---

**Versión:** 1.0.0 • **Última actualización:** Diciembre 2023 • **Licencia:** Propietaria SmartEdify