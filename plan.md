# Plan de Desarrollo Colaborativo SmartEdify_app

## Objetivo
Establecer la hoja de ruta, entregables y criterios de aceptación para el desarrollo seguro y escalable del nuevo repositorio SmartEdify_app, alineado a las mejores prácticas y requisitos enterprise definidos en entorno.md.

---

## Fases y Entregables

### Fase 1: Base y Seguridad
- [x] Estructura inicial del repositorio (carpetas, archivos, CI/CD)
- [x] Identity-service con JWK ES256/EdDSA, JWKS endpoint y rotación doble kid
- [x] Eliminación de JWT_SECRET en .env y CI
- [x] Pruebas unitarias y E2E completas
- [x] Métricas y health-checks expuestos
- [x] Instrumentación OTel básica para login y token

**Criterios de aceptación:**
- Todos los tests unitarios y E2E pasan
- JWKS endpoint público y rotación validada
- No existe JWT_SECRET en variables ni CI
- Métricas y health accesibles
- Trazas OTel visibles en login/token

---

### Fase 2: Contracts-first y Gateway
- [x] Validación OpenAPI/AsyncAPI como gate obligatorio en CI
- [x] Gateway-service con rutas /auth/*, validación JWT/DPoP y rate-limits

**Criterios de aceptación:**
- Pipeline CI falla si no hay contrato actualizado
- Gateway funcional y protegido con rate-limits
- Validación JWT/DPoP activa en gateway

---

### Fase 3: Portal Auth-only y Pruebas
- [x] Portal configurado en modo auth-only (PKCE y OIDC)
- [x] Infra de pruebas con docker-compose.test.yml y scripts de arranque

**Criterios de aceptación:**
- Portal permite login seguro vía PKCE/OIDC
- Sandbox de pruebas operativo con scripts reutilizables

---

## Colaboración y Entregas
- Feature branches para cada mejora
- PRs con revisión obligatoria y status checks
- Documentación técnica y de seguridad actualizada
- Demo funcional al final de cada fase

---

## Notas y Consideraciones
- Todos los cambios son aditivos y no rompen el baseline operativo
- Se prioriza la seguridad, trazabilidad y calidad desde el inicio
- La estructura permite escalar y añadir servicios sin refactorizaciones mayores

---

## Próximos pasos
1. Validar estructura y CI en el nuevo repositorio
2. Iniciar desarrollo incremental por fases
3. Mantener comunicación continua y revisión colaborativa
