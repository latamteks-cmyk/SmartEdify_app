# Gateway Service - Guía de desarrollo y despliegue local

## Requisitos
- Docker y docker-compose
- Acceso a imágenes base: envoyproxy/envoy, envoyproxy/ratelimit, spiffe/spire-server, prom/prometheus, minio/minio

## Estructura relevante
- `envoy.yaml`: Config principal de Envoy
- `config/cors-tenants.yaml`: Políticas CORS por tenant
- `config/ratelimit.yaml`: Políticas de rate limit
- `config/prometheus.yml`: Reglas de scraping y alertas
- `config/otel-collector.yaml`: Pipeline OTel → Prometheus
- `plugins/dpop_validator.wasm`: Plugin WASM (placeholder, reemplazar en CI/CD)
- `docker-compose.yaml`: Orquestación local de gateway y dependencias

## Comandos principales

```sh
# Construir e iniciar gateway y dependencias
cd platform/gateway
sudo docker compose up --build

# Ver logs de Envoy
sudo docker compose logs -f gateway

# Acceso a panel Prometheus
http://localhost:9090

# Acceso a MinIO (S3 local)
http://localhost:9000 (usuario: admin, password: admin123)
```

## Cobertura de pruebas y validación (DoD)

Scripts automatizados en `scripts/`:

- `run_tests.ps1`: Suite completa (PowerShell para Windows).
- `test_gateway.sh`: Endpoints básicos, CORS y headers de seguridad.
- `test_jwt.sh`: Validación JWT/JWKS (algoritmo, kid, issuer, claims).
- `test_pkce.sh`: PKCE obligatorio en `/authorize`.
- `test_waf.sh`: Validaciones WAF (verbos, content-type, tamaño).
- `test_ratelimit.sh`: Rate limiting por tenant/usuario.
- `test_rfc7807.sh`: Errores RFC 7807 (400, 401, 429).
- `test_cors.sh`: CORS por tenant (permitido/prohibido).
- `test_observability.sh`: Métricas Prometheus, logs y trazas.
- `test_resilience.sh`: Circuit breaking, timeouts y retries.

Pruebas manuales/documentadas:
- `test_observabilidad.md`: Métricas Prometheus, logs S3, trazas OTel, dashboards.
- `test_ws.md`: Handshake WebSocket y DPoP (manual/wscat).

### Ejecución

**Windows (PowerShell)**
```powershell
# Desde platform/gateway
./scripts/run_tests.ps1                    # Todos los tests
./scripts/run_tests.ps1 -TestType basic    # Solo tests básicos
./scripts/run_tests.ps1 -TestType waf      # Solo WAF
./scripts/run_tests.ps1 -TestType observability
./scripts/run_tests.ps1 -TestType resilience
```

**Linux/Mac (Bash)**
```bash
# Desde platform/gateway
./scripts/test_gateway.sh
./scripts/test_jwt.sh
./scripts/test_pkce.sh
./scripts/test_waf.sh
./scripts/test_ratelimit.sh
./scripts/test_rfc7807.sh
./scripts/test_cors.sh
./scripts/test_observability.sh
./scripts/test_resilience.sh
```

Consulta los archivos `.md` en `scripts/` para pruebas manuales de observabilidad y WebSocket.

## Notas
- El plugin WASM debe ser reemplazado por el binario real en CI/CD.
- Las rutas de los servicios backend deben estar disponibles en la red local o mockeadas para pruebas.
- Para pruebas de resiliencia y rate limit, ajustar los valores en `config/ratelimit.yaml`.
- Para pruebas de CORS, modificar `config/cors-tenants.yaml`.
