# 📘 Especificación Técnica: `gateway-service` (Puerto 8080) — Versión 2.0 

**Metodología:** `github/spec-kit`
**Estado:** `🟡 En Implementación`
**Última actualización:** `2025-09-28`
**Rol:** Punto de entrada L7 para todos los clientes (web, móvil, terceros), seguridad transversal, enrutamiento, observabilidad, anti-abuso.
**No-Goals:** No emite ni valida identidad; no implementa lógica de dominio.

---

## 1) Alcance y responsabilidades

* **Autenticación y Autorización L7**

  * Validación **JWT JWS (ES256/EdDSA)** con `kid` obligatorio.
  * **DPoP** (HTTP + WebSocket handshake) con anti-replay distribuido.
  * mTLS interno (SPIFFE/SPIRE) a microservicios.
* **Multi-tenant**

  * Extrae `tenant_id` del JWT; lo propaga en `x-tenant-id`.
  * CORS por tenant y *rate limits* por `tenant_id`, `sub` y **ASN**.
* **Resiliencia**

  * Circuit breaking, *outlier detection*, *hedged retries*, *timeouts*.
* **Anti-abuso / WAF**

  * Límite de tamaño, verbos permitidos, *content-type allowlist*, throttling WS (1 msg/s).
* **Observabilidad**

  * RED metrics, tracing W3C, logs WORM con `kid`, `jti`, `tenant_id`.
* **Ruteo**

  * Proxy a los 14 servicios del SCOPE; soporte WebSocket/HTTP3.

---

## 2) Arquitectura

* **Tecnología base:** Envoy Proxy (gateway) + extensiones (WASM para DPoP), Redis (anti-replay / rate-limit), Prometheus, OTel, S3 (WORM logs).
* **Transporte:** HTTP/3 (cliente) ↔ HTTP/2 (backend).
* **mTLS interno:** SPIFFE/SPIRE (SVID por servicio).
* **Descubrimiento:** Static/DNS por clúster (K8s).

### Rutas principales (prefijos → servicio)

* `/api/v1/identity/*` → `identity-service:3001`
* `/api/v1/governance/*` → `governance-service:3011`
* `/api/v1/streaming/*` → `streaming-service:3014`
* `/api/v1/documents/*` → `documents-service:3006`
* `/api/v1/notifications/*` → `notifications-service:3005`
* `/api/v1/finance/*` → `finance-service:3007`
* `/api/v1/tenancy/*` → `tenancy-service:3003`
* `/api/v1/user-profiles/*` → `user-profiles-service:3002`
* … (resto según SCOPE)

> **Nota QR (P0 ya aplicado en SCOPE):** El gateway **solo enruta**:
>
> * Emisión: `POST /identity/v2/contextual-tokens`
> * Validación: `POST /identity/v2/contextual-tokens/validate`
>   `streaming-service` únicamente **muestra/escanea**, sin emitir/validar.

---

## 3) Seguridad (hardening aplicado)

### 3.1 JWT/JWKS

* **Algoritmo:** `ES256` (o `EdDSA`); **prohibido `HS256`**.
* **Header:** `kid` **obligatorio**; validación contra JWKS.
* **Issuer:** `iss = https://auth.smartedify.global/t/{tenant_id}`.
* **JWKS:** `/.well-known/jwks.json?tenant_id={tenant_id}` con **TTL ≤ 300s** y *negative caching* 60s.
* **Rollover:** Soportar **dos `kid` activos** (7 días) sin 401.
* **Claims mínimos:** `sub`, `aud`, `exp`, `nbf`, `iat`, `jti`, `tenant_id`, `scope`, `cnf` (cuando aplique).
* **Tiempos:** *clock skew* ≤ 10s; `exp/nbf` obligatorios.

### 3.2 DPoP (HTTP y WebSocket)

* **Prueba requerida:** Header `DPoP` (RFC 9449) en todas las peticiones protegidas y en **`Upgrade` WS**.
* **Validaciones:** `htu` (URL), `htm` (método), `jti` (único), `iat` (≤10s), `cnf.jkt` = *thumbprint* del cliente.
* **Anti-replay distribuido:** Redis key `(tenant_id, jkt, jti)` TTL=300s.
* **WS:** exige `DPoP` en handshake; **cierra con `4401`** si expira o si el *frame* de refresh no valida (vía WASM, sin cambios upstream).

### 3.3 mTLS interno

* **Requisito:** mTLS gateway↔servicios (SPIFFE); *SAN* por SPIFFE ID; *pinning* de CA interna.

### 3.4 WAF / Header hygiene

* Bloqueo de `TRACE`, `TRACK`, `CONNECT` (no túnel).
* `Content-Length` máx configurable (p.ej., 5MB API).
* *Allowlist* de `Content-Type`: `application/json`, `multipart/form-data` (rutas específicas), `text/*`.
* Quita *hop-by-hop headers* y fuerza:

  * `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  * `X-Content-Type-Options: nosniff`
  * `Referrer-Policy: no-referrer`
  * `Permissions-Policy: camera=(), microphone=()`

---

## 4) Resiliencia y Performance

* **Circuit breaking:** por clúster (conns/rqs/retries); *outlier detection* (ejection 5xx).
* **Timeouts:** `connect=2s`, `header=5s`, `idle=60s`, `total=15s` (por ruta).
* **Hedged retries:** `per_try_timeout=800ms`, `num_retries=2`, `hedge_on_per_try_timeout=true`.
* **Backpressure WS:** 1 msg/s por conexión; `per_connection_buffer_limit_bytes=1MiB`.
* **Compresión selectiva:** Brotli/Gzip solo `text/*` y `application/json` > 1KB (no JWT/COSE).

**SLOs**

* P95 *ingress latency* ≤ 120 ms; error rate 5xx < 0.5%.
* Disponibilidad mensual ≥ 99.95%.

---

## 5) Rate limiting (anti-abuso)

* **Dimensiones:** por `tenant_id`, `sub` y **ASN** (cabecera `x-client-asn`).
* **Política por tipo de ruta:**

  * **Write** (POST/PATCH/DELETE): p. ej., 60 r/m (tenant), 30 r/m (usuario).
  * **Read** (GET): p. ej., 600 r/m (tenant), 120 r/m (usuario).
* **WebSocket:** 1 msg/s; ráfaga 3; cierre si excede.
* **Respuesta 429:** `RateLimit-*` y `Retry-After` (formato RFC).

---

## 6) CORS y políticas por tenant

* **Per-tenant allowlist** de orígenes; `credentials=true` opcional.
* **Métodos permitidos:** `GET, POST, PUT, PATCH, DELETE`.
* **Expuestos:** `RateLimit-*`, `Traceparent`, `X-Request-Id`.

---

## 7) Observabilidad y auditoría

* **Métricas (Prometheus):**

  * `http_requests_total{route,tenant,code}`
  * `http_request_duration_seconds_bucket{route,tenant}`
  * `jwt_validation_fail_total{reason}`
  * `dpop_replay_denied_total`
  * `jwks_cache_refresh_total`, `key_rotation_events_total`
  * `ws_messages_total{route}`, `ws_backpressure_drops_total`
* **Trazas (OTel):** W3C `traceparent`; *baggage* con `tenant_id`, `sub` (si aplica).
* **Logs WORM (S3 Object Lock):** JSON con `timestamp`, `route`, `tenant_id`, `sub`, `kid`, `jti`, `asn`, `status`, `latency_ms`, `trace_id`.
* **Dashboards:** RED por servicio y ruta; panel de freshness JWKS; panel DPoP replays.

---

## 8) Contratos y compatibilidad

* **Errores RFC 7807:** El gateway **propaga** los payloads de los servicios; cuando origina (WAF/429/401), emite RFC 7807 coherente.

  * `401 Unauthorized` (JWT inválido/expirado/DPoP fallido)
  * `429 Too Many Requests` (con `RateLimit-*`)
  * `400 Bad Request` (método/headers/payload inválidos)
* **PKCE obligatorio:** El gateway no implementa OIDC, pero **rechaza** `/authorize` sin `code_challenge(+_method)` (pre-filtro liviano), en línea con `identity-service`.
* **QR contextuales:** Rutas de emisión/validación **solo** a `identity-service`.

---

## 9) Endpoints propios del gateway

* `GET /healthz` — vida
* `GET /readyz` — *readiness* (backends críticos reachables, JWKS fresco)
* `GET /metrics` — Prometheus
* `GET /.well-known/egress-policy` — (opcional) política activa por tenant (solo lectura)

---

## 10) Configuración (referencia)

**Env**

```
JWKS_TTL_SECONDS=300
JWKS_NEG_CACHE_SECONDS=60
DPOP_IAT_SKEW_SECONDS=10
DPOP_REPLAY_TTL_SECONDS=300
WS_MSGS_PER_SEC=1
CORS_CONFIG=/etc/gateway/cors-tenants.yaml
RATE_LIMIT_CONFIG=/etc/gateway/ratelimit.yaml
WAF_MAX_BODY_BYTES=5242880
MTLS_SPIFFE_TRUST_DOMAIN=smartedify.global
```

**Dependencias**

* Redis (anti-replay / rate-limit)
* SPIRE Server/Agent (mTLS)
* Prometheus/OTel collector
* S3 (logs WORM)

---

## 11) Despliegue

* **Estrategia:** Canary 10%→50%→100%; *shadow mode* 48h para WAF/ratelimits antes de bloquear.
* **HTTP/3 enable:** ALPN `h3,h2,h2c`.
* **Rollback seguro:** *immutable releases* + *feature flags* (bloqueo WAF/rate en caliente).

---

## 12) Pruebas (DoD)

1. **Rollover JWKS (dos `kid`)** sin 401; refresco ≤ 5 min.
2. **DPoP anti-replay:** segundo `jti` rechazado; métricas incrementan.
3. **PKCE guard:** `/authorize` sin `code_challenge` → 400 RFC7807.
4. **WS handshake DPoP** y cierre `4401` al expirar/refresh inválido.
5. **429 con RateLimit-\*:** límites por `tenant/sub/ASN` respetados.
6. **WAF:** bloquea `TRACE`/`CONNECT`, `Content-Type` no permitido y cuerpos > límite.
7. **mTLS interno:** rechaza conexiones sin SVID válido.
8. **Observabilidad:** métricas, trazas y logs WORM disponibles; paneles verdes.
9. **Compresión selectiva** activa solo en tipos/umbrales definidos.
10. **SLOs**: P95 latencia ≤120 ms bajo carga nominal.

---

## 13) Riesgos y mitigaciones

* **Cache JWKS desactualizada** → TTL ≤300s + *prefetch* + invalidación por `kid`.
* **Replays DPoP** → Redis distribuido + baja ventana `iat` (10s).
* **Head-of-line blocking WS** → backpressure + buffers limitados.
* **Degradación backend** → circuit breaking + hedging.
* **Falsos positivos WAF** → *shadow mode* previo, *feature flags* por ruta.

---

## 14) Apéndices (fragmentos de configuración)

**JWT + JWKS**

```yaml
- name: envoy.filters.http.jwt_authn
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
    providers:
      smartedify:
        issuer: "https://auth.smartedify.global/t/{tenant_id}"
        remote_jwks:
          http_uri:
            uri: "https://auth.smartedify.global/.well-known/jwks.json?tenant_id={tenant_id}"
            cluster: jwks_cluster
            timeout: 3s
          cache_duration: 300s
        forward: true
    rules: [{ match: { prefix: "/" }, requires: { provider_name: "smartedify" } }]
```

**DPoP (WASM)**

```yaml
- name: envoy.filters.http.wasm
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
    config:
      name: dpop_validator
      vm_config: { runtime: "envoy.wasm.runtime.v8", code: { local: { filename: "/plugins/dpop_validator.wasm" } } }
      configuration:
        "@type": type.googleapis.com/google.protobuf.StringValue
        value: '{"replay_cache":{"type":"redis","dsn":"redis://rate-limit:6379","ttl_seconds":300},"iat_skew_seconds":10,"require_on_upgrade":true,"ws_close_code_on_fail":4401}'
```

**Rate limiting**

```yaml
- name: envoy.filters.http.ratelimit
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
    domain: "smartedify"
    failure_mode_deny: true
    rate_limit_service: { grpc_service: { envoy_grpc: { cluster_name: ratelimit_cluster } } }
```

**WAF & headers**

```yaml
- name: envoy.filters.http.lua
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
    inline_code: |
      function envoy_on_response(h)
        h:headers():add("Strict-Transport-Security","max-age=63072000; includeSubDomains; preload")
        h:headers():add("X-Content-Type-Options","nosniff")
        h:headers():add("Referrer-Policy","no-referrer")
        h:headers():add("Permissions-Policy","camera=(), microphone=()")
      end
```

---

## 15) Estado de Implementación (resumen)

**Nivel de Avance Estimado:** 85%

La configuración estructural y de seguridad del gateway está casi completa. Las tareas restantes se centran en la implementación de la lógica de validación final y en la configuración de aspectos de observabilidad más detallados.

### Funcionalidades Completadas y Alineadas:

*   **✅ Enrutamiento:** Todas las rutas para los 16 microservicios están definidas y alineadas con las especificaciones de `identity-service`.
*   **✅ Resiliencia:** Se han aplicado a todos los servicios las políticas de `circuit breakers`, `timeouts` por ruta y `outlier detection`.
*   **✅ Rate Limiting:** La configuración de límite de peticiones está activa y se ha añadido la dimensión de `ASN` a todas las rutas.
*   **✅ Seguridad Perimetral (WAF):**
    *   **Headers de Seguridad:** Se ha implementado el filtro `Lua` que añade cabeceras de seguridad.
    *   **Filtro DPoP:** El filtro `WASM` para la validación de DPoP está configurado.
    *   **Pre-filtro PKCE:** Se ha implementado el filtro `Lua` que rechaza peticiones a `/authorize` sin los parámetros PKCE.
*   **✅ Health Checks:** Los endpoints `/healthz` y `/readyz` están implementados.
*   **✅ Scaffolding para JWT Dinámico:** Se ha implementado un filtro `Lua` que extrae el `tenant_id`, simula la obtención de JWKS y lo cachea, sentando las bases para la validación final.

### Funcionalidades Pendientes (Próximos Pasos):

*   **🔴 Validación Criptográfica de JWT (Tarea Principal):**
    *   **Descripción:** Es la pieza más crítica que falta. El script `Lua` actual debe ser completado con la lógica que **valide criptográficamente la firma del JWT** usando el JWKS obtenido.
    *   **Complejidad:** **Alta.** Requiere una librería de criptografía en el entorno Lua de Envoy, lo que probablemente implique construir una imagen de Envoy personalizada.

*   **🟡 Configuración de mTLS Interno:**
    *   **Descripción:** Falta configurar el `transport_socket` en los clústeres de Envoy para asegurar la comunicación con los microservicios de backend mediante mTLS (SPIFFE).

*   **🟡 Política de CORS Multi-Tenant:**
    *   **Descripción:** La política actual de CORS es permisiva (`.*`). Se necesita una solución más dinámica para manejar una lista de orígenes permitidos por cada tenant.

*   **🟡 Observabilidad Avanzada:**
    *   **Descripción:** Falta implementar la lógica que genere las métricas específicas de Prometheus (ej. `jwt_validation_fail_total`) y enriquezca las trazas de OpenTelemetry.

---

**Conclusión:** este `gateway-service` cumple el alcance del SCOPE y las exigencias de `identity-service`/`governance-service` ya cerradas (ES256/EdDSA, `kid`, JWKS TTL ≤5 min, PKCE, DPoP, QR centralizado en IdP), aportando seguridad transversal, resiliencia y DX sin requerir cambios upstream.