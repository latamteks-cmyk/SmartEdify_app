# Gateway Service - Guía de desarrollo y despliegue local

## Requisitos
- Docker y docker-compose
- Acceso a imágenes base: envoyproxy/envoy, envoyproxy/ratelimit, spiffe/spire-server, prom/prometheus, minio/minio

## Estructura relevante
- `envoy.yaml`: Config principal de Envoy
- `config/cors-tenants.yaml`: Políticas CORS por tenant
- `config/ratelimit.yaml`: Políticas de rate limit
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

- `run_tests.ps1`: Suite completa de pruebas (PowerShell para Windows)
- `test_gateway.sh`: Endpoints básicos, CORS, headers de seguridad (Linux/Mac)
- `test_waf.sh`: WAF (verbos, content-type, tamaño)
- `test_observability.sh`: Métricas Prometheus, logs, trazas
- `test_resilience.sh`: Circuit breaking, timeouts, retries

### Ejecución

**Windows (PowerShell):**
```powershell
# Desde platform/gateway
.\scripts\run_tests.ps1                    # Todos los tests
.\scripts\run_tests.ps1 -TestType basic    # Solo tests básicos
.\scripts\run_tests.ps1 -TestType waf      # Solo WAF
.\scripts\run_tests.ps1 -TestType observability  # Solo observabilidad
.\scripts\run_tests.ps1 -TestType resilience     # Solo resiliencia
```

**Linux/Mac (Bash):**
```bash
# Desde platform/gateway
./scripts/test_gateway.sh
./scripts/test_waf.sh
./scripts/test_observability.sh
./scripts/test_resilience.sh
```

## Notas
- El plugin WASM debe ser reemplazado por el binario real en CI/CD.
- Las rutas de los servicios backend deben estar disponibles en la red local o mockeadas para pruebas.
- Para pruebas de resiliencia y rate limit, ajustar los valores en `config/ratelimit.yaml`.
- Para pruebas de CORS, modificar `config/cors-tenants.yaml`.


