# ADR-0001: Gateway Service Architecture

- **Policy-Version:** 1.0
- **Owner:** Plataforma
- **Effective-Date:** 2025-09-30
- **Status:** Approved

## Context
El gateway es el punto de entrada L7, responsable de seguridad transversal, ruteo, observabilidad y anti-abuso. Se requiere cumplir con JWT ES256/EdDSA, DPoP, mTLS, CORS, rate limits y resiliencia, sin lógica de dominio.

## Decision
- Usar Envoy Proxy como base, extensiones WASM para DPoP, Redis para anti-replay y rate-limit, SPIFFE/SPIRE para mTLS, Prometheus/OTel para observabilidad, S3 para logs WORM.
- Rutas y políticas según especificación técnica.

## Consecuencias
- Seguridad y resiliencia centralizadas.
- Menor acoplamiento entre servicios.
- Requiere mantenimiento de reglas y dashboards.

## Related-Policies
- [POLICY_INDEX.md](../POLICY_INDEX.md)
- [gateway-service.md](../../referencias/gateway-service.md)
