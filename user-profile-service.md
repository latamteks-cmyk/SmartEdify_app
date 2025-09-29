# 📘 Especificación Técnica Detallada — `user-profiles-service` (a.k.a. `user-profile-service`)

**Versión:** 2.0 • **Puerto:** 3002 • **Estado:** Draft para aprobación final
**Rol:** Fuente canónica de perfiles, membresías, roles locales y entitlements por condominio; cálculo de permisos efectivos vía políticas externas.
**No-Goals:** Autenticación/OIDC, emisión de tokens, definición de reglas legales (delegadas a `compliance-service`/PDP).

---

## 1) Alcance y responsabilidades

* CRUD de **perfiles** de usuario por tenant.
* Gestión de **membresías** a condominios/unidades y su ciclo de vida.
* **Roles locales** por condominio (catálogo activado desde plantillas por país).
* **Entitlements** modulares por contratos de servicio (marketplace u otros).
* Exposición de **permisos efectivos** por acción consultando PDP (OPA/Cedar/Cedar-like).
* **Arrendatario** vs **Conviviente** con reglas de voz/voto/delegación y responsable.
* **Historial inmutable** de cambios de perfil y membresía.
* **DSAR proxy** y cumplimiento de consents.
* Emisión/consumo de **eventos** para sincronización inter-servicios.

---

## 2) Integraciones y límites

* **Entradas de seguridad (vía gateway):** JWT JWS `ES256/EdDSA` con `kid` y `tenant_id`; DPoP obligatorio en escritura; JWKS TTL ≤ 300 s.
* **Dependencias:**

  * `identity-service`: `sub` canónico, sesiones, DSAR.
  * `tenancy-service`: unidades, alícuotas, meta de condominio.
  * `governance-service`: delegaciones de voto, elegibilidad de voto (vía finance).
  * `finance-service`: señal de habilitación de voto por período.
  * `compliance-service` (PDP): políticas por país/condominio.
  * `notifications-service`: avisos y redirecciones.
  * `marketplace-service` (cuando exista): contratos → entitlements.

---

## 3) Dominio y reglas de negocio

### 3.1 Estados de Perfil

* `PENDING_VERIFICATION → ACTIVE ↔ LOCKED → INACTIVE`
* Transiciones:

  * `activate`: ADMIN/SYSTEM.
  * `lock`/`unlock`: ADMIN con motivo.
  * `deactivate`: solo si sin membresías activas ni roles vigentes.
* Efecto: bloqueo de escritura en entidades vinculadas cuando `LOCKED/INACTIVE`.

### 3.2 Ciclo de vida de Membresía

* Operaciones: **create**, **update** (atributos/fechas), **terminate**, **transfer**.
* **Transfer**: cierra registro actual (`until`) y crea nuevo con `since`.
* Historial **append-only** obligatorio.

### 3.3 Arrendatario vs Conviviente

* `relation = TENANT` con `tenant_type = ARRENDATARIO`

  * `voice_in_assembly=true`, `vote_in_assembly=false` por defecto.
  * Voto solo si **delegación activa** registrada en governance (se evalúa en tiempo real, no se persiste como booleano permanente).
  * `responsible_profile_id` = propietario.
* `relation = CONVIVIENTE` (`tenant_type = CONVIVIENTE`)

  * `report=true`, `reserve=true`, `notify_redirect=true`; sin voz ni voto.
  * `responsible_profile_id` = arrendatario o propietario.
* Sobrescrituras por **política país/condominio** via PDP.

### 3.4 Roles locales y plantillas

* **Plantillas por país** versionadas (PRESIDENT, SECRETARY, ADMIN, MODERATOR, RESIDENT, GUARD, STAFF, etc.).
* **Catálogo por condominio** activa/desactiva plantillas y aplica `overrides` restrictivos permitidos por política.

### 3.5 Entitlements modulares

* Llaves finas por servicio/módulo (`finance.admin`, `maintenance.contractor`, `hr.supervisor`, `legal.observer`, `marketplace.admin`, etc.).
* Siempre **scoped** por `condominium_id`.

### 3.6 Autorización efectiva (PBAC/ABAC)

* Regla: `allow = RBAC ∨ entitlement ∧ PDP_rules(context)`
* PDP decide según país, reglamento, estado de pagos, delegaciones, modalidad, etc.
* `deny-by-default` si PDP no responde y la acción es crítica.

---

## 4) API (REST) — Contratos clave

**Prefijo:** `/api/v1/user-profiles`
**Convenciones:** `Idempotency-Key` en POST críticos; errores RFC 7807; paginación por cursor.

### 4.1 Perfiles

* `GET /me` → perfil + membresías + roles + entitlements resumidos.
* `GET /{profile_id}`
* `POST /` (ADMIN)

  ```json
  {
    "id": "uuid-optional-or-null",
    "email": "user@condo.com",
    "phone": "+51...",
    "full_name": "Nombre Apellido",
    "country_code": "PE",
    "status": "PENDING_VERIFICATION"
  }
  ```
* `PATCH /{profile_id}` → campos permitidos.
* Estados:

  * `POST /profiles/{id}:activate`
  * `POST /profiles/{id}:lock` { "reason": "..." }
  * `POST /profiles/{id}:unlock`
  * `POST /profiles/{id}:deactivate`

### 4.2 Membresías

* `GET /{profile_id}/memberships?status=active&condominium_id=...`
* `POST /{profile_id}/memberships`

  ```json
  {
    "condominium_id":"uuid",
    "unit_id":"uuid-or-null",
    "relation":"OWNER|TENANT|CONVIVIENTE|STAFF|PROVIDER",
    "tenant_type":"ARRENDATARIO|CONVIVIENTE",
    "responsible_profile_id":"uuid",
    "since":"2025-09-01T00:00:00Z"
  }
  ```
* `PATCH /memberships/{id}` → fechas/atributos.
* `POST /memberships/{id}:terminate` { "until": "..." }
* `POST /memberships/{id}:transfer` { "to_unit_id":"uuid", "effective_at":"..." }

### 4.3 Config de Arrendatario/Conviviente

* `PUT /memberships/{id}/tenant-config`

  ```json
  {
    "tenant_type":"ARRENDATARIO|CONVIVIENTE",
    "voice_in_assembly": true,
    "vote_in_assembly": false,
    "delegate_required": true,
    "responsible_profile_id":"uuid"
  }
  ```

### 4.4 Roles

* `GET /roles?condominium_id=...`
* `PUT /{profile_id}/roles`

  ```json
  { "condominium_id":"uuid", "assign":[ "ADMIN","RESIDENT" ], "revoke":[ "MODERATOR" ] }
  ```

### 4.5 Catálogo y Políticas

* `GET /catalog/templates?country=PE`
* `PUT /catalog/condominiums/{condo}/activate-template/{template_id}`
* `POST /catalog/custom-roles` { "condominium_id":"...","name":"...","permissions":[...]}
* `POST /policy/bindings`

  ```json
  { "condominium_id":"uuid","policy_id":"uuid","policy_version":"v2025.09","scope":"profiles|governance|finance|*" }
  ```
* `GET /policy/bindings?condominium_id=...`

### 4.6 Entitlements

* `GET /{profile_id}/entitlements?condominium_id=...`
* `POST /{profile_id}/entitlements:grant`

  ```json
  { "condominium_id":"uuid","service_code":"finance","entitlement_key":"finance.admin" }
  ```
* `POST /{profile_id}/entitlements:revoke` (mismo shape)

### 4.7 Evaluación de permisos (PDP)

* `POST /evaluate`

  ```json
  {
    "condominium_id":"uuid",
    "profile_id":"uuid",
    "action":"governance.vote",
    "context": { "country":"PE", "assembly_id":"...", "period":"2025-09" }
  }
  ```
* **Respuesta**

  ```json
  { "allow":true, "reason":"eligible + delegated", "policy_id":"...", "policy_version":"..." }
  ```

### 4.8 Bulk y Export

* `POST /bulk/validate` → reporte de errores (CSV/JSON).
* `POST /bulk/execute` → `job_id` (async).
* `GET /exports?format=csv|json` → URL firmada con expiración.

### 4.9 Consents y DSAR

* `GET /{profile_id}/consents` • `PUT /{profile_id}/consents`
* `POST /privacy/data` → crea `job_id` y orquesta (proxy IdP/Compliance).

---

## 5) Modelo de datos (PostgreSQL, RLS ON)

```sql
-- Perfiles (proyección del IdP + datos de negocio)
CREATE TABLE profiles (
  id UUID PRIMARY KEY,                -- = sub del IdP
  tenant_id UUID NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  preferred_name TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION', -- + ACTIVE|LOCKED|INACTIVE
  picture_url TEXT,
  country_code TEXT,
  external_ref TEXT,                  -- opcional ERP/CRM
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, email)
);

-- Membresías
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  condominium_id UUID NOT NULL,
  unit_id UUID,
  relation TEXT NOT NULL,             -- OWNER|TENANT|CONVIVIENTE|STAFF|PROVIDER
  tenant_type TEXT,                   -- ARRENDATARIO|CONVIVIENTE (cuando aplique)
  privileges JSONB NOT NULL DEFAULT '{}'::jsonb, -- voz/voto/redirect/...
  responsible_profile_id UUID REFERENCES profiles(id),
  since TIMESTAMPTZ NOT NULL DEFAULT now(),
  until TIMESTAMPTZ,
  status TEXT GENERATED ALWAYS AS (
    CASE WHEN until IS NULL OR until > now() THEN 'ACTIVE' ELSE 'ENDED' END
  ) STORED,
  UNIQUE (tenant_id, profile_id, condominium_id, unit_id, relation)
);

-- Roles por país (plantillas)
CREATE TABLE role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  version TEXT NOT NULL,
  name TEXT NOT NULL,                 -- ADMIN|PRESIDENT|...
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (country_code, version, name)
);

-- Catálogo por condominio (activaciones/overrides)
CREATE TABLE condo_role_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  condominium_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES role_templates(id),
  enabled BOOLEAN NOT NULL DEFAULT true,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Roles locales (instancias activas)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  condominium_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (tenant_id, condominium_id, name)
);

-- Asignaciones de rol
CREATE TABLE role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  condominium_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- Entitlements modulares
CREATE TABLE profile_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  condominium_id UUID NOT NULL,
  service_code TEXT NOT NULL,       -- 'finance'|'maintenance'|'hr'|'legal'|...
  entitlement_key TEXT NOT NULL,    -- 'finance.admin', etc.
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- Consents
CREATE TABLE communication_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  channel TEXT NOT NULL,            -- EMAIL|SMS|PUSH|WHATSAPP
  purpose TEXT NOT NULL,            -- e.g., 'governance.notices'
  allowed BOOLEAN NOT NULL,
  policy_version TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, profile_id, channel, purpose)
);

-- Historial append-only
CREATE TABLE profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  event_type TEXT NOT NULL,         -- CREATED|UPDATED|STATUS_CHANGED|...
  data JSONB NOT NULL,
  actor UUID,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE membership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  membership_id UUID NOT NULL,
  event_type TEXT NOT NULL,         -- CREATED|UPDATED|TERMINATED|TRANSFERRED
  data JSONB NOT NULL,
  actor UUID,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vinculación de políticas por condominio/módulo
CREATE TABLE policy_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  condominium_id UUID NOT NULL,
  policy_id UUID NOT NULL,
  policy_version TEXT NOT NULL,
  scope TEXT NOT NULL               -- 'profiles'|'governance'|'finance'|'*'
);
```

**RLS:** habilitar en todas las tablas con `tenant_id`; política `tenant_id = current_setting('app.tenant_id')::uuid`.
**Índices recomendados:**

* BTree: `(tenant_id, condominium_id)`, `(tenant_id, status)`
* GIN: `profiles (full_name gin_trgm_ops)`, `profile_entitlements (entitlement_key)`, `memberships (privileges)`

---

## 6) Autorización y PDP

### 6.1 Contrato con PDP

**Input (ejemplo):**

```json
{
  "tenant_id":"...",
  "condominium_id":"...",
  "profile_id":"...",
  "action":"governance.vote",
  "attributes":{
    "roles":["RESIDENT"],
    "entitlements":["finance.viewer"],
    "membership":{"relation":"TENANT","tenant_type":"ARRENDATARIO"},
    "flags":{"voice":true,"vote":false},
    "context":{"country":"PE","period":"2025-09","is_eligible":true,"delegated":true}
  }
}
```

**Output:**

```json
{ "allow": true, "reason":"delegated + eligible", "policy_id":"...", "policy_version":"..." }
```

**SLA:** timeout PDP 150 ms; acciones críticas `fail-closed`; **grace cache** 60 s para lectura no crítica.

### 6.2 Caché de evaluación

* Clave = hash(input); TTL 60–120 s.
* Invalidadores por eventos: `PolicyUpdated`, `RoleChanged`, `MembershipChanged`, `EntitlementChanged`.

---

## 7) Seguridad

* JWT `ES256/EdDSA` con `kid` obligatorio; validación en gateway; JWKS TTL ≤ 300 s.
* **DPoP** en toda **escritura**; anti-replay distribuido.
* mTLS interno (SPIFFE/SPIRE).
* CORS por tenant heredado del gateway.
* Logs WORM sin PII; mascarado de `email`/`phone`; trazas OTel.

---

## 8) Eventos (Kafka, patrón outbox)

* `UserProfileCreated|Updated|StatusChanged|Deleted`
* `MembershipCreated|Updated|Terminated|Transferred`
* `RoleAssigned|RoleRevoked`
* `EntitlementGranted|EntitlementRevoked`
* `PolicyBindingSet|PolicyBindingUpdated`
* `DSARDeleteRequested|DSARStatusChanged`
  **Campos mínimos:** `event_id`, `tenant_id`, `condominium_id?`, `profile_id?`, `actor`, `occurred_at`, `trace_id`.
  **Idempotencia:** por `event_id`.

---

## 9) Observabilidad

* **Métricas (Prometheus):**

  * `http_requests_total{route,tenant,code}`
  * `evaluate_latency_seconds_bucket` (SLO P95 ≤ 150 ms)
  * `policy_cache_hits_total`, `policy_cache_invalidations_total`
  * `profiles_active{tenant,condo}`, `memberships_active{relation}`
  * `bulk_jobs_running_total`, `exports_generated_total`
* **Trazas (OTel):** incluir `tenant_id`, `condominium_id`, `profile_id`, `policy_id`, `policy_version`.
* **Logs WORM:** diffs JSON de roles/entitlements/estados, con `actor` y `reason`.

---

## 10) Rendimiento y SLOs

* `GET /me`, `GET /{id}` P95 ≤ 120 ms.
* Listados/búsquedas P95 ≤ 200 ms.
* `POST /evaluate` P95 ≤ 150 ms (incluyendo PDP o cache).
* 5xx < 0.5% mensual.

---

## 11) Operación

* **Idempotency-Key** en `activate|lock|unlock|deactivate|transfer|bulk/execute|entitlements`.
* **Optimistic locking** (`row_version`) en `profiles`/`memberships`.
* **Rate limits:** write 120 rpm/usuario; bulk 2 jobs/min/tenant; export 10/min.
* **Migraciones** expand/contract; FKs `NOT VALID` → `VALIDATE` en ventana.
* **Backups** y restauración por servicio; seeds de `role_templates` por país.

---

## 12) Seguridad y cumplimiento

* **RLS** por `tenant_id` y, según tabla, por `condominium_id`.
* **Consents** versionados por `purpose` y `channel`.
* **DSAR:** mapa de campos eliminables y `crypto-erase` de atributos sensibles; coordinación con IdP/Compliance; auditoría completa.
* **Privacidad:** 0 PII en métricas y cuerpos de eventos; redacción en logs.

---

## 13) Testing y DoD

* **Unit + Integration** ≥ 80% cobertura.
* **RLS tests** multi-tenant y multi-condominio.
* **Matrix tests** país×condominio para plantillas y PDP.
* **Chaos PDP:** latencia, error, caída → validar `fail-closed` y `grace-cache`.
* **Fuzz** de `bulk/validate` y búsqueda.
* **Redacción PII** verificable en logs/exports.
* **OpenAPI 3.1** publicado con ejemplos y esquemas.
* **Dashboards** y alertas (latencia evaluate, 5xx, cache hit-rate).

---

## 14) Roadmap de implementación (sugerido)

1. Esquema base `profiles/memberships/roles/role_assignments` + RLS.
2. Plantillas por país y catálogo por condominio.
3. Entitlements y eventos.
4. Endpoints de estados y transferencias.
5. PDP `/evaluate` con cache y invalidaciones.
6. DSAR/consents.
7. Bulk/exports y hardening de observabilidad.

