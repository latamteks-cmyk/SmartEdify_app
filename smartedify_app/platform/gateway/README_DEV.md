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

## Notas
- El plugin WASM debe ser reemplazado por el binario real en CI/CD.
- Las rutas de los servicios backend deben estar disponibles en la red local o mockeadas para pruebas.
- Para pruebas de resiliencia y rate limit, ajustar los valores en `config/ratelimit.yaml`.
- Para pruebas de CORS, modificar `config/cors-tenants.yaml`.

---

- [Documentación principal](README.md)
