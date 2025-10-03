# Threat Model: Gateway Service

- **Policy-Version:** 1.0
- **Owner:** Plataforma
- **Effective-Date:** 2025-09-30
- **Related-ADR:** ADR-0001-gateway

## 1. Actores y superficies
- Clientes externos (web, móvil, terceros)
- Microservicios internos
- Redis, SPIRE, S3, Prometheus

## 2. Amenazas principales
- JWT forjados o con algoritmos débiles (HS256)
- Replays DPoP (HTTP/WS)
- Fuga de claves privadas (SPIRE, JWKS)
- Ataques DoS (rate-limit, buffer overflow)
- Falsos positivos WAF
- Exposición de logs sensibles

## 3. Controles
- Validación estricta JWT/JWKS (ES256/EdDSA, `kid` obligatorio)
- DPoP anti-replay con Redis, TTL bajo
- mTLS SPIFFE/SPIRE, pinning CA
- WAF: allowlist verbos y content-type, límites de tamaño
- Logs WORM, acceso restringido S3
- Feature flags para mitigación rápida

## 4. Recomendaciones
- Rotación de claves JWKS y SPIRE
- Simulación de ataques (chaos, fuzzing)
- Auditoría periódica de reglas WAF y rate-limit

---

- [Política principal](../POLICY_INDEX.md)
- [ADR relevante](../adr/ADR-0001-gateway.md)
