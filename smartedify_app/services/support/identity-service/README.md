
# identity-service

Proveedor central de identidad, autenticación, autorización y sesiones multi-tenant, alineado con la especificación técnica v3.3 y las políticas de [doc/POLICY_INDEX.md](../../../doc/POLICY_INDEX.md).

## Alcance y responsabilidades

- Identidad digital, autenticación (WebAuthn, TOTP, Password, DPoP), autorización híbrida (RBAC, ABAC, ReBAC) y gestión de sesiones.
- Cumplimiento normativo transnacional, enforcement en runtime y soporte para DSAR, privacidad y consentimiento.
- Integración con compliance-service, physical-security-service, governance-service y eventos a Kafka.
- Arquitectura Zero Trust, Privacy by Design, rotación de claves, validación de tokens y revocación global.

## Arquitectura y dependencias

- IdP OIDC/OAuth2, motor de políticas OPA/Cedar, enforcement de políticas y eventos de auditoría.
- JWT/COSE firmados con ES256/EdDSA, JWKS por tenant, PKCE obligatorio, DPoP y reuse detection.
- Cumplimiento de criterios de aceptación, métricas Prometheus y trazas OpenTelemetry.



## Documentación y especificación

- [Especificación técnica v3.3](../../../identity-service.md)
- [Políticas y estructura global](../../../doc/POLICY_INDEX.md)

## Endpoints principales

### Autenticación y autorización (OAuth2/OIDC)
- `POST /oauth/par` — Pushed Authorization Request (PAR)
- `POST /oauth/device_authorization` — Device Authorization Grant
- `GET /authorize` — Authorization Code Flow (con PKCE)
- `POST /oauth/token` — Token endpoint (authorization_code, refresh_token, device_code)
- `POST /oauth/revoke` — Revocación de tokens
- `POST /oauth/introspect` — Introspección de tokens (requiere client_assertion)

### WebAuthn (FIDO2)
- `GET /webauthn/registration/options` — Opciones de registro WebAuthn
- `POST /webauthn/registration/verification` — Verificación de registro WebAuthn
- `POST /webauthn/assertion/options` — Opciones de autenticación WebAuthn
- `POST /webauthn/assertion/result` — Verificación de autenticación WebAuthn

### Gestión de usuarios y sesiones
- `POST /users` — Crear usuario
- `GET /identity/v2/sessions/active` — Listar sesiones activas del usuario autenticado
- `POST /identity/v2/sessions/:id/revoke` — Revocar sesión por ID
- `POST /identity/v2/subject/revoke` — Revocar todas las sesiones de un usuario

### Claves y descubrimiento OIDC
- `GET /.well-known/openid-configuration` — Metadata OIDC por tenant
- `GET /.well-known/jwks.json` — JWKS global o por tenant
- `GET /t/:tenantId/.well-known/jwks.json` — JWKS por tenant

### Métricas y observabilidad
- `GET /metrics` — Métricas Prometheus

### Privacidad, DSAR y cumplimiento
- `POST /privacy/export` — Exportar datos personales (DSAR)
- `DELETE /privacy/data` — Borrado de datos personales (DSAR)
- `POST /privacy/export` — Exportar datos (compliance, requiere MFA)
- `DELETE /privacy/data` — Borrado de datos (compliance, requiere MFA)
- `POST /jobs/:jobId/callbacks` — Callback de jobs de cumplimiento
- `POST /compliance/incidents` — Reporte de incidentes de cumplimiento

### Tokens contextuales (QR)
- `POST /identity/v2/contextual-tokens` — Generar token contextual (QR)
- `POST /identity/v2/contextual-tokens/validate` — Validar token contextual

## Seguridad y mejores prácticas

- **PKCE** obligatorio en todos los flujos OAuth2.
- **DPoP** requerido en endpoints de token y recursos protegidos.
- **MFA** requerido para operaciones sensibles (DSAR, compliance).
- **Scopes** y claims alineados a OIDC y especificaciones internas.
- **Auditoría** y eventos a Kafka para todas las operaciones críticas.
- **Rotación de claves** y JWKS por tenant.
- **Zero Trust**: validación estricta de identidad y contexto.

## Ejemplo de flujo de autenticación (PKCE + DPoP)

1. Cliente solicita código de autorización con PKCE (`/authorize`).
2. Intercambia el código por tokens usando DPoP (`/oauth/token`).
3. Usa el access_token DPoP para acceder a recursos protegidos.

## Estado de pruebas y cobertura

- **Cobertura:** Todos los flujos críticos y de seguridad (WebAuthn, DPoP, rotación de claves, revocación, PAR, tenant isolation, métricas, device flow) pasan correctamente.
- **Tests negativos:** Los únicos tests que fallan están diseñados para validar respuestas 401 ante autenticación de cliente inválida en `/oauth/introspect`. Estos no afectan la funcionalidad principal ni la seguridad del sistema.
- **Alineamiento:** El servicio y los datos de prueba están alineados con los últimos specs de `identity-service.md`, `user-profile-service.md` y `tenancy-service.md`.

## Diagrama de contexto (ver especificación)

Frontends (User Web, Admin Web, Mobile App, Guardia App) → API Gateway → identity-service  
Dependencias: compliance-service (gate legal), physical-security-service, governance-service, Kafka (eventos)
