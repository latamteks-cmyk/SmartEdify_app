# Configuración declarativa para Gateway

Este directorio contiene archivos de configuración YAML/JSON para políticas de CORS, rate limiting y otros parámetros del gateway.

- `cors-tenants.yaml`: Políticas CORS por tenant.
- `ratelimit.yaml`: Políticas de rate limit por tenant, usuario y ASN.
- `cors-tenants.json`: Ejemplo alternativo en JSON (legacy o para pruebas).
- `envoy.yaml`: Configuración de ejemplo para pruebas unitarias o validación de sintaxis.

**Nota:** Los archivos aquí son montados en el contenedor y pueden ser reemplazados por pipelines de CI/CD según el entorno.
