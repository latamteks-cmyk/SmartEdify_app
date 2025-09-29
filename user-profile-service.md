# 📘 Especificación Técnica Final — `user-profiles-service`

**Versión:** 2.1 • **Puerto:** 3002 • **Estado:** ✅ Listo para desarrollo

---

## 0) Rol y límites

* Fuente **canónica** de perfiles de usuario, membresías, roles locales y entitlements.
* Gestiona relaciones **persona ↔ unidad** (propietario, arrendatario, conviviente, staff, proveedor).
* Exposición de permisos efectivos vía **PDP** (`compliance-service`).
* **No** hace autenticación ni emisión de tokens (`identity-service`).
* **No** define reglas legales; delega en `compliance-service`.

---

## 1) Alcance y responsabilidades

* CRUD de **perfiles** por tenant.
* Ciclo de vida de **membresías** en condominios/unidades.
* Definición de **roles locales** (plantillas por país + catálogo por condominio).
* Gestión de **entitlements** modulares por servicio contratado.
* Exposición de **permisos efectivos** (`/evaluate`).
* Soporte a **Arrendatario** y **Conviviente** con responsable y reglas de voz/voto.
* Manejo de **consents** y cumplimiento de DSAR.
* Emisión de **eventos** para sincronización.

---

## 2) Contexto de multi-tenancy

* `tenant_id` = **cliente SaaS** (administradora o junta de propietarios).
* `condominium_id` = condominio dentro del tenant.
* **RLS** en todas las tablas por `tenant_id`; consultas por `condominium_id` donde aplique.

---

## 3) Modelo de negocio

* **Propietario (OWNER)**: siempre vinculado a una `unit_id(kind='PRIVATE')`.
* **Arrendatario (TENANT, tenant_type=ARRENDATARIO)**: responsable = propietario; `voice=true`, `vote=false` salvo delegación válida.
* **Conviviente (CONVIVIENTE)**: responsable = arrendatario/propietario; permisos = reportar, reservar, redirigir notificaciones.
* **Staff (STAFF)**: personal interno con permisos operativos.
* **Proveedor (PROVIDER)**: actor externo, vinculado a contratos/OTs.
* **Invitado (VISITOR)**: temporal, TTL definido.

---

## 4) API (prefijo `/api/v1/user-profiles`)

### 4.1 Perfiles

* `GET /me` → perfil + membresías + roles + entitlements.
* `GET /{profile_id}`
* `POST /` (ADMIN)
* `PATCH /{profile_id}`
* Estados:

  * `POST /profiles/{id}:activate`
  * `POST /profiles/{id}:lock` { "reason": "..." }
  * `POST /profiles/{id}:unlock`
  * `POST /profiles/{id}:deactivate`

### 4.2 Membresías

* `GET /{profile_id}/memberships`
* `POST /{profile_id}/memberships`
* `PATCH /memberships/{id}`
* `POST /memberships/{id}:terminate`
* `POST /memberships/{id}:transfer`
* `PUT /memberships/{id}/tenant-config` para arrendatario/conviviente.

### 4.3 Roles

* `GET /roles?condominium_id=...`
* `PUT /{profile_id}/roles`

### 4.4 Catálogo y políticas

* `GET /catalog/templates?country=PE`
* `PUT /catalog/condominiums/{condo}/activate-template/{template_id}`
* `POST /catalog/custom-roles`
* `POST /policy/bindings`
* `GET /policy/bindings?condominium_id=...`

### 4.5 Entitlements

* `GET /{profile_id}/entitlements?condominium_id=...`
* `POST /{profile_id}/entitlements:grant`
* `POST /{profile_id}/entitlements:revoke`

### 4.6 Evaluación de permisos

* `POST /evaluate` → integra PDP y cache.

### 4.7 Bulk y export

* `POST /bulk/validate`
* `POST /bulk/execute`
* `GET /exports?format=csv|json`

### 4.8 Consents y DSAR

* `GET /{profile_id}/consents`
* `PUT /{profile_id}/consents`
* `POST /privacy/data` (proxy IdP/Compliance)

---

## 5) Modelo de datos (PostgreSQL, RLS ON)

```sql
-- Perfiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  email TEXT NOT NULL CHECK (char_length(email) <= 254),
  phone TEXT CHECK (phone ~ '^\+?[1-9]\d{7,14}$'),
  full_name TEXT NOT NULL CHECK (char_length(full_name) <= 140),
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
  country_code TEXT,
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
  unit_id UUID REFERENCES tenancy.units(id),
  relation TEXT NOT NULL CHECK (relation IN ('OWNER','TENANT','CONVIVIENTE','STAFF','PROVIDER','VISITOR')),
  tenant_type TEXT CHECK (tenant_type IN ('ARRENDATARIO','CONVIVIENTE')),
  privileges JSONB NOT NULL DEFAULT '{}'::jsonb,
  responsible_profile_id UUID REFERENCES profiles(id),
  since TIMESTAMPTZ DEFAULT now(),
  until TIMESTAMPTZ,
  status TEXT GENERATED ALWAYS AS (
    CASE WHEN until IS NULL OR until > now() THEN 'ACTIVE' ELSE 'ENDED' END
  ) STORED
);

-- Roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  condominium_id UUID NOT NULL,
  name TEXT NOT NULL,
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
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- Entitlements
CREATE TABLE profile_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  condominium_id UUID NOT NULL,
  service_code TEXT NOT NULL,
  entitlement_key TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- Consents
CREATE TABLE communication_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  channel TEXT NOT NULL,
  purpose TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  policy_version TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Historial
CREATE TABLE profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  condominium_id UUID,
  profile_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  actor UUID,
  ts TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE membership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  condominium_id UUID,
  membership_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  actor UUID,
  ts TIMESTAMPTZ DEFAULT now()
);

-- Políticas
CREATE TABLE policy_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  condominium_id UUID NOT NULL,
  policy_id UUID NOT NULL,
  policy_version TEXT NOT NULL,
  scope TEXT NOT NULL
);
```

**Constraints adicionales:**

* `responsible_profile_id` debe pertenecer al mismo `condominium_id` con relation ∈ {OWNER,TENANT}.
* `unit_id` con `kind='COMMON'` no admite membresías.

---

## 6) Integridad y validación

* **Input**: `email` RFC5322 (simplificado), `phone` E.164, `full_name` ≤ 140.
* **privileges** JSON Schema (campos conocidos).
* **responsible_profile_id** validado en trigger.
* **soft delete**: `deleted_at`, preferir `status=INACTIVE`. DSAR aplica `crypto-erase`.

---

## 7) Eventos (Kafka)

* `UserProfileCreated|Updated|StatusChanged`
* `MembershipCreated|Updated|Terminated|Transferred`
* `RoleAssigned|RoleRevoked`
* `EntitlementGranted|EntitlementRevoked`
* `PolicyBindingSet|Updated`
* `DSARRequested|Completed`
  Campos: `event_id`, `tenant_id`, `condominium_id`, `profile_id`, `actor`, `trace_id`.

---

## 8) Seguridad

* JWT `ES256/EdDSA`, `kid` obligatorio, validación en gateway.
* DPoP obligatorio en **write**.
* mTLS interno (SPIFFE/SPIRE).
* RLS activo en todas las tablas.
* Logs WORM, mascarado de PII.

---

## 9) Observabilidad

* **Métricas**:

  * `profiles_active{tenant,condo}`
  * `memberships_active{relation}`
  * `evaluate_latency_seconds_bucket`
  * `policy_cache_hits_total`, `pdp_fail_closed_total`
  * `bulk_jobs_running_total`, `exports_generated_total`
* **Trazas**: incluyen `tenant_id`, `condominium_id`, `policy_id/version`.
* **Logs**: JSON estructurado con diffs y `actor`.

---

## 10) Rendimiento y SLOs

* `GET /me` y `GET /{id}` P95 ≤ 120 ms.
* `POST /evaluate` P95 ≤ 150 ms.
* Búsquedas P95 ≤ 200 ms.
* Error 5xx < 0.5% mensual.

---

## 11) Operación

* `Idempotency-Key` en POST críticos.
* Optimistic locking en `profiles`/`memberships`.
* Bulk limitado a 10k filas/job, 5 jobs concurrentes/tenant.
* Export ≤ 10/min.
* Migraciones expand/contract.

---

## 12) Checklist de entrega (DoD)

* Esquema desplegado con RLS.
* OpenAPI 3.1 publicado con ejemplos.
* Tests unitarios+integración ≥ 80%.
* Pruebas de RLS multi-tenant.
* Matriz país×condominio validada contra PDP.
* Chaos test PDP (latencia/fallas) validando `fail-closed`.
* Validación de redacción PII en logs/exports.
* Dashboards RED disponibles.

---

¿Quieres que genere directamente el **OpenAPI 3.1 YAML completo** (con ejemplos de requests, responses y errores RFC 7807) para entregarlo al equipo de desarrollo?
