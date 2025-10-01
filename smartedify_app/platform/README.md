# platform/

Componentes de plataforma compartidos para SmartEdify:
- gateway/: WAF, CORS, rate limits (norte-sur)
- mesh/: mTLS, S2S authZ, retries, circuit breaking
- events/: AsyncAPI, esquemas, outbox/idempotencia
- observability/: Otel collectors, dashboards, SLOs
- security/: OPA bundles, CSP/HSTS, KMS
- shared/: librerías comunes (tipos, SDKs OpenAPI, tracing)

Consulta las políticas globales en [doc/POLICY_INDEX.md](../doc/POLICY_INDEX.md).