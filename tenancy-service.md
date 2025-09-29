# 📘 Especificación Técnica  — `tenancy-service`

**Versión:** 1.0 • **Puerto sugerido:** 3003 • **Estado:** ✅ Listo para spec
**Rol:** Fuente canónica de tenants, condominios, edificios y unidades. Mantiene la **estructura física y organizativa** de cada comunidad.
**No-Goals:** No gestiona personas (eso es de `user-profiles-service`). No maneja OTs ni métricas (eso es de `asset-management-service`).

---

## 1) Alcance y responsabilidades

* Crear y mantener **tenants** (cliente SaaS: administradora o junta).
* Registrar y gestionar **condominios** bajo cada tenant.
* Definir **edificios** y metadatos estructurales.
* Gestionar **unidades** (privadas y comunes) de cada condominio.
* Exponer catálogo estructural a otros servicios (`user-profiles`, `asset`, `reservation`, `finance`, `governance`).
* Emitir eventos de cambios para sincronización y reporting.

---

## 2) Multi-tenant y aislamiento

* `tenant_id` = cliente SaaS (ej. administradora de edificios, junta).
* `condominium_id` = comunidad específica bajo un tenant.
* **RLS** activo en todas las tablas por `tenant_id`.
* Algunas tablas requieren filtros adicionales por `condominium_id`.

---

## 3) Modelo de dominio

### 3.1 Tenants

* Tipos:

  * `ADMINISTRADORA`: puede tener varios condominios.
  * `JUNTA`: normalmente gestiona uno.
* Estado: `ACTIVE | SUSPENDED | CANCELLED`.

### 3.2 Condominios

* Datos básicos: nombre, dirección, país, estado.
* Configuraciones financieras (`financial_profile`): reglas de alícuotas, retenciones, políticas locales.

### 3.3 Edificios

* Pertenen a un condominio.
* Datos: nombre, número de niveles, metadatos estructurales.

### 3.4 Unidades (`units`)

* Tabla única, con unicidad local por condominio.
* Tipos:

  * `PRIVATE`: propiedades asignadas a propietarios/inquilinos.
  * `COMMON`: áreas comunes (piscina, cowork, pasillo, etc.).
* Clave natural: `local_code` único por condominio.
* Atributos: área, piso, alícuota, metadatos.
* Áreas comunes: `common_type`, `cost_center_id`, `revenue_cfg`.
* Estado: `ACTIVE | INACTIVE`.

---

## 4) API (prefijo `/api/v1/tenancy`)

### 4.1 Tenants

* `POST /tenants`

  ```json
  { "type":"ADMINISTRADORA","legal_name":"Gestora XYZ","country_code":"PE" }
  ```
* `GET /tenants/{id}`
* `PATCH /tenants/{id}`
* `POST /tenants/{id}:deactivate`

### 4.2 Condominios

* `POST /condominiums`
* `GET /condominiums/{id}`
* `PATCH /condominiums/{id}`
* `POST /condominiums/{id}:deactivate`

### 4.3 Edificios

* `POST /buildings`
* `GET /buildings?condominium_id=...`
* `PATCH /buildings/{id}`
* `DELETE /buildings/{id}` (solo si no tiene unidades)

### 4.4 Unidades

* `POST /units`

  ```json
  {
    "condominium_id":"...",
    "local_code":"T-101",
    "kind":"PRIVATE",
    "building_id":"...",
    "aliquot":0.025,
    "floor":"10",
    "area_m2":85,
    "meta":{"rooms":3}
  }
  ```
* `POST /units` con `kind=COMMON`

  ```json
  {
    "condominium_id":"...",
    "local_code":"AC-PISCINA",
    "kind":"COMMON",
    "common_type":"pool",
    "cost_center_id":"CC-001",
    "revenue_cfg":{
      "reservation":{"hour_price":20,"currency":"PEN","min_block":60},
      "penalties":{"no_show":15,"late_cancel_pct":50},
      "exemptions":{"board_members":true}
    }
  }
  ```
* `PATCH /units/{id}` (actualizar dimensiones, meta, cost_center, revenue_cfg)
* `POST /units/{id}:deactivate`
* `GET /units?condominium_id=...&kind=PRIVATE|COMMON`
* `POST /units:bulk/validate`
* `POST /units:bulk/execute`

---

## 5) Modelo de datos (PostgreSQL, RLS ON)

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ADMINISTRADORA','JUNTA')),
  legal_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE condominiums (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  address TEXT,
  country_code TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  financial_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE buildings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  condominium_id UUID NOT NULL REFERENCES condominiums(id),
  name TEXT NOT NULL,
  levels INT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(tenant_id, condominium_id, name)
);

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
  UNIQUE(tenant_id, condominium_id, local_code)
);
```

**Constraints y triggers adicionales**:

* `building_id` obligatorio si el condominio es multi-torre.
* `kind=COMMON` no admite membresías de personas (valida en `user-profiles-service`).
* `revenue_cfg` validado contra JSON Schema.
* Job de consistencia valida que la suma de `aliquot` por condominio ≤ 1.

---

## 6) Eventos (Kafka)

* `TenantCreated|Updated|Deactivated`
* `CondominiumCreated|Updated|Deactivated`
* `BuildingCreated|Updated|Deleted`
* `UnitCreated|Updated|Deactivated`
* `CommonAreaPricingUpdated`

Todos incluyen: `event_id`, `tenant_id`, `condominium_id`, `unit_id?`, `actor`, `occurred_at`, `trace_id`.
Idempotencia por `event_id`.

---

## 7) Integraciones

* **user-profiles-service**: `memberships.unit_id` referencia `tenancy.units(id)`.
* **asset-management-service**: vincula métricas (`spaces`) a `units`.
* **reservation-service**: usa `units(kind=COMMON).revenue_cfg` para reglas de reserva.
* **finance-service**: mapea `units.cost_center_id` a su plan de cuentas.
* **governance-service**: consulta `condominium_id` y `aliquot` para snapshots de voto.

---

## 8) Seguridad

* Autenticación vía gateway (JWT ES256/EdDSA, `kid` obligatorio, DPoP en escrituras).
* mTLS interno (SPIFFE/SPIRE).
* RLS activo en todas las tablas (`tenant_id = current_setting('app.tenant_id')::uuid`).
* Auditoría WORM de cambios estructurales.

---

## 9) Observabilidad

* Métricas Prometheus:

  * `units_total{tenant,condo,kind}`
  * `common_areas_total{type}`
  * `revenue_cfg_updates_total`
  * `aliquot_sum_deviation{condo}`
* Trazas OTel con `tenant_id`, `condominium_id`, `unit_id`.
* Logs JSON con diffs de cambios.

---

## 10) Rendimiento y escalabilidad

* Índices:

  * `units(tenant_id, condominium_id)`
  * `units(tenant_id, condominium_id, kind)`
  * `units(tenant_id, condominium_id, local_code)` único.
* Particionamiento por `tenant_id` cuando N ≥ 10M filas.
* Read replicas para búsquedas por condominio.
* Materialized views para reporting pesado.

---

## 11) Operación y migración

* Estrategia **expand/contract** para cambios de esquema.
* Jobs de consistencia:

  * `aliquot_rebalance`
  * `local_code_rename` con alias 90 días
  * `common_area_tariff_rollout` programado
* Backups + restore a punto en el tiempo.
* Validación de FKs `NOT VALID` → `VALIDATE`.

---

## 12) Checklist de entrega (DoD)

* Esquema desplegado con RLS activo.
* OpenAPI 3.1 publicado con ejemplos y errores RFC 7807.
* Eventos Kafka emitidos y consumidos en staging.
* Tests unitarios+integración ≥ 80%.
* Tests de consistencia de alícuotas y unicidad de `local_code`.
* Dashboards RED configurados.
* Documentación de JSON Schema para `revenue_cfg`.
---
