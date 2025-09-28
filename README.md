# SmartEdify_app

Repositorio base para la plataforma SmartEdify. Incluye estructura inicial, recomendaciones enterprise y configuración para desarrollo colaborativo.

## Estructura
- apps/: bff, portal
- services/: identity-service, gateway-service
- contracts/: openapi, asyncapi
- infra/: scripts, docker-compose.test.yml
- config/: plantillas de entorno y secrets
- docs/: arquitectura, seguridad, API
- .github/: workflows CI/CD

## Requisitos
- Node.js >= 18
- Docker
- PostgreSQL

## Seguridad
- JWT con JWK ES256/EdDSA y JWKS
- Rotación de claves con doble kid
- Validación DPoP
- PKCE y OIDC
- Observabilidad con métricas y trazas OTel

## Contratos
- Contracts-first obligatorio (OpenAPI/AsyncAPI)

## Pruebas
- docker-compose.test.yml para sandbox
- Scripts de arranque en infra/scripts
