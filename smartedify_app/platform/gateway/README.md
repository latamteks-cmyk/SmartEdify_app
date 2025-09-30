
# Gateway Service

> **Policy-Version:** 2.0
> **Owner:** Plataforma
> **Effective-Date:** 2025-09-30
> **Related-ADR:** ADR-0001-gateway

## Visión
El gateway es el punto de entrada L7 para todos los clientes (web, móvil, terceros), aplicando seguridad transversal, enrutamiento, observabilidad y anti-abuso. No implementa lógica de dominio ni emite/valida identidad.

## Alcance y responsabilidades
- Autenticación/autorización L7 (JWT JWS ES256/EdDSA, DPoP, mTLS interno)
- Multi-tenant: extrae y propaga `tenant_id`, CORS y rate limits por tenant, sub y ASN
- Resiliencia: circuit breaking, outlier detection, hedged retries, timeouts
- Anti-abuso/WAF: límites de tamaño, verbos, content-type, throttling WS
- Observabilidad: métricas RED, tracing W3C, logs WORM
- Ruteo: proxy a servicios SCOPE, soporte WebSocket/HTTP3

## Arquitectura
- **Base:** Envoy Proxy + extensiones (WASM DPoP), Redis, Prometheus, OTel, S3
- **Transporte:** HTTP/3 (cliente) ↔ HTTP/2 (backend)
- **mTLS:** SPIFFE/SPIRE
- **Descubrimiento:** Static/DNS (K8s)

### Rutas principales
- `/api/v1/identity/*` → identity-service
- `/api/v1/governance/*` → governance-service
- `/api/v1/streaming/*` → streaming-service
- `/api/v1/documents/*` → documents-service
- `/api/v1/notifications/*` → notifications-service
- `/api/v1/finance/*` → finance-service
- `/api/v1/tenancy/*` → tenancy-service
- `/api/v1/user-profiles/*` → user-profiles-service

## Seguridad
- JWT/JWKS ES256/EdDSA, `kid` obligatorio, issuer por tenant, rollover 2 `kid` activos
- DPoP obligatorio (HTTP/WS), anti-replay Redis, cierre 4401 en WS
- mTLS SPIFFE/SPIRE, pinning CA interna
- WAF: bloquea TRACE/CONNECT, content-length, allowlist content-type
- Headers: HSTS, nosniff, referrer, permissions-policy

## Resiliencia y performance
- Circuit breaking, outlier detection, hedged retries, timeouts
- Backpressure WS, compresión selectiva Brotli/Gzip
- SLOs: P95 latencia ≤120ms, error rate 5xx <0.5%, disponibilidad ≥99.95%

## Rate limiting
- Por tenant, sub, ASN; políticas diferenciadas por método (write/read)
- WebSocket: 1 msg/s, ráfaga 3
- Respuesta 429 con RateLimit-* y Retry-After

## CORS y políticas por tenant
- Allowlist de orígenes, métodos permitidos, headers expuestos

## Observabilidad y auditoría
- Métricas Prometheus, trazas OTel, logs WORM S3
- Dashboards RED, JWKS freshness, DPoP replays

## Endpoints propios
- `GET /healthz` — vida
- `GET /readyz` — readiness
- `GET /metrics` — Prometheus
- `GET /.well-known/egress-policy` — política activa por tenant

## Configuración
**Variables env:**
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
**Dependencias:** Redis, SPIRE, Prometheus/OTel, S3

## Despliegue
- Canary 10%→50%→100%, shadow mode WAF/ratelimits, rollback seguro
- HTTP/3 enable: ALPN `h3,h2,h2c`
- Rollback seguro: releases inmutables + feature flags

## Pruebas (DoD)
1. Rollover JWKS (dos `kid`) sin 401; refresco ≤5 min
2. DPoP anti-replay: segundo `jti` rechazado; métricas incrementan
3. PKCE guard: `/authorize` sin `code_challenge` → 400 RFC7807
4. WS handshake DPoP y cierre 4401 al expirar/refresh inválido
5. 429 con RateLimit-*: límites por tenant/sub/ASN respetados
6. WAF: bloquea TRACE/CONNECT, Content-Type no permitido y cuerpos > límite
7. mTLS interno: rechaza conexiones sin SVID válido
8. Observabilidad: métricas, trazas y logs WORM disponibles; paneles verdes
9. Compresión selectiva activa solo en tipos/umbrales definidos
10. SLOs: P95 latencia ≤120 ms bajo carga nominal

## Riesgos y mitigaciones
- JWKS desactualizada → TTL ≤300s + prefetch + invalidación por `kid`
- Replays DPoP → Redis distribuido + baja ventana `iat` (10s)
- Head-of-line blocking WS → backpressure + buffers limitados
- Degradación backend → circuit breaking + hedging
- Falsos positivos WAF → shadow mode previo, feature flags por ruta

---

- [Política principal](../../doc/POLICY_INDEX.md)
- [ADR relevante](../../doc/adr/ADR-0001-gateway.md)
- [Diagramas](../../doc/diagrams/gateway-arch.md)
- [Runbook](../../doc/runbooks/gateway-incident.md)
- [Seguridad](../../doc/security/THREAT_MODEL-gateway.md)
- [Product](../../doc/product/gateway-roadmap.md)
