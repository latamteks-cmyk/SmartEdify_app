# SmartEdify API Gateway

## Autenticación JWT multi-tenant

* El filtro `envoy.filters.http.lua` decodifica el `Bearer` recibido en `Authorization` sin validar la firma.
  * Extrae `kid`, `iss` y `tenant_id` (permite variantes `tenantId` y `https://smartedify.global/tenant_id`).
  * Inyecta los encabezados `x-jwt-kid`, `x-jwt-issuer` y `x-tenant-id` para los filtros aguas abajo.
  * Publica la metadata dinámica `smartedify.auth.{kid,issuer,tenant_id}` que se reutiliza en el `jwt_authn`.
* El proveedor `jwt_authn.providers.smartedify` construye el `issuer` y el endpoint JWKS por petición:
  * `issuer: %DYNAMIC_METADATA(smartedify.auth:issuer)%`
  * `remote_jwks.http_uri.uri: http://identity-service:3001/.well-known/jwks.json?tenant_id=%DYNAMIC_METADATA(smartedify.auth:tenant_id)%`
  * `cache_duration` está fijado en `300s` para cumplir con el SLA de refresco ≤5 min.
* `claim_to_headers` mantiene sincronizado `x-tenant-id`/`x-jwt-issuer` incluso cuando la cabecera inicial no estaba presente.

## CORS específico por tenant

* El mismo filtro Lua carga una política declarativa desde `CORS_CONFIG` (por defecto `/etc/gateway/cors-tenants.json`).
* Formato esperado (`origins` soporta listas y expresiones regulares ancladas `^…$`):

```json
{
  "tenants": {
    "tenant-alpha": {
      "origins": ["https://alpha.smartedify.app"],
      "allow_methods": "GET, POST, PUT, PATCH, DELETE",
      "allow_headers": "Content-Type, Authorization, DPoP",
      "expose_headers": "RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Traceparent, X-Request-Id",
      "allow_credentials": true
    },
    "*": {
      "origins": ["https://sandbox.smartedify.app"],
      "allow_methods": "GET, POST, PUT, PATCH, DELETE",
      "allow_headers": "Content-Type, Authorization, DPoP",
      "expose_headers": "RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Traceparent, X-Request-Id",
      "allow_credentials": true
    }
  }
}
```

* Para preflight (`OPTIONS`) el filtro responde directamente `204` con la configuración autorizada.
* Solicitudes con `Origin` no listado obtienen `403 forbidden_origin` antes de impactar a los servicios internos.

## Seguridad de cabeceras

El mismo filtro asegura siempre:

* `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
* `X-Content-Type-Options: nosniff`
* `Referrer-Policy: no-referrer`
* `Permissions-Policy: camera=(), microphone=()`

## Validaciones automáticas

Ejecutar `pytest tests/test_gateway_envoy_config.py` garantiza:

1. Las cabeceras `x-jwt-kid` y `x-jwt-issuer` siguen presentes en la configuración.
2. `remote_jwks` mantiene `cache_duration` ≤ 300 s.
3. No se reintroduce el comodín `.*` en políticas CORS y se conserva el rechazo explícito de orígenes no autorizados.
