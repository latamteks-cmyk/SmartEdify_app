# Arquitectura SmartEdify_app

- Microservicios: identity-service, gateway-service
- Gateway: rutas /auth/*, validación JWT/DPoP, rate-limits
- Portal: modo auth-only, PKCE, OIDC
- Seguridad: JWK ES256/EdDSA, JWKS, rotación doble kid
- Observabilidad: métricas Prometheus, trazas OTel
- Pruebas: docker-compose.test.yml, scripts
