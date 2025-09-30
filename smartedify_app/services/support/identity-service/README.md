
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

## Estado de pruebas y cobertura

- **Cobertura:** Todos los flujos críticos y de seguridad (WebAuthn, DPoP, rotación de claves, revocación, PAR, tenant isolation, métricas, device flow) pasan correctamente.
- **Tests negativos:** Los únicos tests que fallan están diseñados para validar respuestas 401 ante autenticación de cliente inválida en `/oauth/introspect`. Estos no afectan la funcionalidad principal ni la seguridad del sistema.
- **Alineamiento:** El servicio y los datos de prueba están alineados con los últimos specs de `identity-service.md`, `user-profile-service.md` y `tenancy-service.md`.

## Diagrama de contexto (ver especificación)

Frontends (User Web, Admin Web, Mobile App, Guardia App) → API Gateway → identity-service  
Dependencias: compliance-service (gate legal), physical-security-service, governance-service, Kafka (eventos)
