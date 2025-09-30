# WASM Plugins para Gateway

Este directorio contiene los plugins WASM requeridos por Envoy para validación avanzada (ej. DPoP).

- `dpop_validator.wasm`: Validador de DPoP (placeholder, reemplazar por binario real en CI/CD).

## Instrucciones
- El archivo debe ser reemplazado por el binario compilado real en el pipeline de CI/CD o manualmente antes de despliegue a producción.
- Para desarrollo local, el placeholder permite construir la imagen y probar la integración de filtros.
