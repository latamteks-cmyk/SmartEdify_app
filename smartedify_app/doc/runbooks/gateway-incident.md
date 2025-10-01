# Runbook: Gateway Service Incident Response

- **Policy-Version:** 1.0
- **Owner:** Plataforma
- **Effective-Date:** 2025-09-30
- **Related-ADR:** ADR-0001-gateway

## 1. Detección
- Alertas Prometheus: latencia, error rate, DPoP/jwt failures, circuit breaking, rate-limit.
- Logs WORM S3: errores 401/429/5xx, anomalías de tráfico.

## 2. Diagnóstico
- Verificar dashboards RED, JWKS freshness, DPoP replays.
- Revisar logs por tenant, jti, kid, ASN.
- Validar estado de Redis, SPIRE, S3.

## 3. Respuesta
- Reiniciar Envoy si hay fuga de memoria o deadlock.
- Invalidar JWKS cache si hay errores de firma.
- Escalar a SRE si SPIRE/Redis caen.
- Activar feature flags para bloquear rutas WAF/rate.

## 4. Recuperación
- Rollback a release anterior si el canary falla.
- Validar readiness (`/readyz`) y métricas (`/metrics`).
- Documentar incidente y acciones en post-mortem.

## 5. Prevención
- Revisar reglas WAF y rate-limit en shadow mode antes de bloquear.
- Simular incidentes con chaos testing.

---

- [Política principal](../POLICY_INDEX.md)
- [ADR relevante](../adr/ADR-0001-gateway.md)
