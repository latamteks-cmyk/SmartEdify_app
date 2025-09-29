
# Plan de Implementación OIDC Avanzado — SmartEdify_app (PRIORIDAD CTO)

## Objetivo
Cerrar todas las brechas OIDC avanzado y cumplimiento identificadas en la especificación y el contrato, garantizando interoperabilidad, seguridad y auditabilidad a nivel enterprise.

---

## Fases y Entregables

### Fase 1: Discovery y JWKS Rollover
- [ ] Endpoint `/.well-known/openid-configuration?tenant_id={id}` con `jwks_uri` correcto por tenant
- [ ] Endpoint `/.well-known/jwks.json?tenant_id={id}` con soporte de doble `kid` durante rollover
- [ ] Pruebas unitarias y E2E para discovery y JWKS rollover

**Criterios de aceptación:**
- Discovery y JWKS cumplen OpenID Core y exponen claves activas según SLA de rotación
- Pruebas E2E validan rollover y selección de clave por `kid`

---

### Fase 2: Endpoints OIDC Obligatorios
- [ ] `/authorize` (PKCE obligatorio, scopes y claims configurables)
- [ ] `/oauth/par` (Pushed Authorization Request)
- [ ] `/oauth/token` (DPoP, rotación y reuse detection de refresh token)
- [ ] `/oauth/introspect` (client auth fuerte)
- [ ] `/oauth/revoke` (revocación de refresh y access token)
- [ ] `/oauth/device_authorization` (Device Flow)
- [ ] `/logout` y `/backchannel-logout` (logout global y notificaciones)
- [ ] Pruebas E2E y unitarias para todos los flujos

**Criterios de aceptación:**
- Todos los endpoints cumplen OpenID/OAuth2 y el contrato OpenAPI
- Pruebas E2E cubren flujos exitosos y de error

---

### Fase 3: Claims, Scopes y Consentimiento
- [ ] Claims y scopes personalizables por tenant
- [ ] Consentimiento granular (consent screen) y registro en `consent_audits`
- [ ] Endpoints y lógica de auditoría de consentimientos
- [ ] Pruebas E2E y unitarias de consentimiento y claims

**Criterios de aceptación:**
- Consentimiento y claims auditables y configurables por cliente
- Pruebas E2E validan consentimiento y claims personalizados

---

### Fase 4: Pruebas Contractuales y Certificación
- [ ] Pruebas contractuales OIDC (OpenID Certification/conformance suite)
- [ ] Validación de interoperabilidad con clientes externos
- [ ] Documentación OpenAPI y ejemplos de integración actualizados

**Criterios de aceptación:**
- Todos los endpoints OIDC cumplen con el contrato y los perfiles estándar
- Pruebas contractuales y de interoperabilidad pasan
- Documentación y ejemplos de integración actualizados

---

## Colaboración y Entregas
- Feature branches para cada mejora
- PRs con revisión obligatoria y status checks
- Documentación técnica y de seguridad actualizada
- Demo funcional al final de cada fase

---

## Notas y Consideraciones
- Todos los cambios son aditivos y no rompen el baseline operativo
- Se prioriza la seguridad, trazabilidad y calidad desde el inicio
- La estructura permite escalar y añadir servicios sin refactorizaciones mayores

---
1. Validar estructura y CI en el nuevo repositorio
2. Iniciar desarrollo incremental por fases
3. Mantener comunicación continua y revisión colaborativa
