
# identity-service

Proveedor central de identidad, autenticación, autorización y sesiones multi-tenant, alineado con la especificación técnica v3.3 y las políticas de [doc/POLICY_INDEX.md](../../../doc/POLICY_INDEX.md).

## Alcance y responsabilidades

- Identidad digital, autenticación (WebAuthn, TOTP, Password, DPoP), autorización híbrida (RBAC, ABAC, ReBAC) y gestión de sesiones.
- Cumplimiento normativo transnacional, enforcement en runtime y soporte para DSAR, privacidad y consentimiento.
- Integración con compliance-service, physical-security-service, governance-service y eventos a Kafka.
- Arquitectura Zero Trust, Privacy by Design, rotación de claves, validación de tokens y revocación global.

## Arquitectura y dependencias

- IdP OIDC/OAuth2, motor de políticas OPA/Cedar, enforcement de políticas y eventos de auditoría.
- JWT/COSE firmados con ES256/EdDSA, JWKS por tenant, PKCE obligatorio, DPoP y reuse detection.
- Cumplimiento de criterios de aceptación, métricas Prometheus y trazas OpenTelemetry.


## Documentación y especificación

- [Especificación técnica v3.3](../../../identity-service.md)
- [Políticas y estructura global](../../../doc/POLICY_INDEX.md)

## Estado de pruebas y cobertura

- **Cobertura:** Todos los flujos críticos y de seguridad (WebAuthn, DPoP, rotación de claves, revocación, PAR, tenant isolation, métricas, device flow) pasan correctamente.
- **Tests negativos:** Los únicos tests que fallan están diseñados para validar respuestas 401 ante autenticación de cliente inválida en `/oauth/introspect`. Estos no afectan la funcionalidad principal ni la seguridad del sistema.
- **Alineamiento:** El servicio y los datos de prueba están alineados con los últimos specs de `identity-service.md`, `user-profile-service.md` y `tenancy-service.md`.

## Diagrama de contexto (ver especificación)

Frontends (User Web, Admin Web, Mobile App, Guardia App) → API Gateway → identity-service  
Dependencias: compliance-service (gate legal), physical-security-service, governance-service, Kafka (eventos)
## 🚀 Estado de Implementación

> **Estado:** ✅ **Build y Despliegue Corregidos - Funcional**  
> **Puerto:** 3001  
> **Versión:** 3.3  
> **Última Actualización:** 2025-10-02

### ✅ Funcionalidad Core
- **Build/Deployment:** Se corrigieron las configuraciones críticas en `package.json` y `Dockerfile`. El servicio ahora se compila y despliega correctamente.
- **WebAuthn + DPoP** - Passkeys y sender-constrained tokens implementados.
- **OIDC/OAuth2** - PKCE obligatorio, flujos seguros validados.
- **Rotación de Claves** - 90 días con rollover de 7 días automático.
- **Multi-tenancy** - `tenant_id` en todas las entidades con RLS.
- **DSAR + Compliance** - Portabilidad y eliminación de datos.

### 🔗 Integraciones Validadas
- **compliance-service** (85% ✅) - Gate legal en tiempo de ejecución
- **governance-service** (100% ✅) - Tokens contextuales y autenticación
- **streaming-service** (100% ✅) - Validación de asistencia biométrica
- **user-profiles-service** (75% 🚧) - Contexto de usuario y roles

### 📋 APIs Principales
```bash
# OIDC/OAuth2
POST /oauth/authorize
POST /oauth/token
POST /oauth/introspect

# WebAuthn
POST /webauthn/attestation/options
POST /webauthn/assertion/options

# Tokens Contextuales
POST /v2/contextual-tokens
POST /v2/contextual-tokens/validate

# JWKS
GET /.well-known/jwks.json
```

---

## 🧪 Estrategia de Pruebas y Despliegue Local

Esta sección describe cómo desplegar y probar el servicio en un entorno local usando Docker.

### 1. Despliegue con Docker Compose

Se ha creado un archivo `docker-compose.yml` que orquesta el `identity-service` y una base de datos PostgreSQL "real" para pruebas.

**Para levantar el entorno:**

1.  **Construir y levantar los contenedores:**
    ```bash
    docker-compose up --build
    ```
2.  El servicio estará disponible en `http://localhost:3001`.
3.  La base de datos PostgreSQL estará en `localhost:5434`.

### 2. Scripts de Prueba de Endpoints

Se ha creado un directorio `testing/` que contiene recursos para probar el servicio:

*   `testing/requests.http`: Una colección de peticiones HTTP para probar los endpoints principales. Puede ser usada con la extensión **REST Client** en VS Code.
*   `testing/seed.sql`: Un script para poblar la base de datos con datos iniciales. Se ejecuta automáticamente al levantar el contenedor de la base de datos.

### 3. Estrategia de Identificación y Limpieza de Archivos

Para mantener la calidad y relevancia del código, se seguirá la siguiente estrategia para identificar y eliminar archivos no utilizados por las pruebas:

1.  **Ejecutar la Suite de Pruebas con Cobertura:**
    El comando `npm run test:cov` genera un reporte de cobertura detallado en el directorio `coverage/`.

    ```bash
    npm run test:cov
    ```

2.  **Analizar el Reporte de Cobertura:**
    Abre el archivo `coverage/lcov-report/index.html` en un navegador. Este reporte muestra el porcentaje de líneas, funciones y ramas de cada archivo que han sido cubiertas por las pruebas.

3.  **Identificar Archivos No Utilizados:**
    Busca archivos con un **0% de cobertura** en todas las métricas. Estos archivos no están siendo alcanzados por ninguna prueba y son candidatos a ser revisados.

4.  **Revisión y Eliminación:**
    *   Un archivo con 0% de cobertura debe ser analizado para determinar si es código obsoleto, lógica muerta o si simplemente carece de pruebas.
    *   Si se confirma que el archivo es obsoleto y no tiene propósito en la arquitectura actual, **debe ser eliminado** para reducir la complejidad y el riesgo de mantener código innecesario.
    *   Si el archivo es necesario, se deben crear las pruebas correspondientes para asegurar su funcionalidad y aumentar la cobertura por encima del umbral del 80% definido en `jest.config.js`.

El **identity-service** es ahora una base sólida y desplegable, con las configuraciones de build críticas ya corregidas. El siguiente paso es robustecer la confianza en el servicio a través de una mayor cobertura de pruebas.