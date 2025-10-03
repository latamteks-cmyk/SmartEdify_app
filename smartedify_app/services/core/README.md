# Core Services

Servicios fundamentales que proporcionan la base para toda la plataforma SmartEdify.

## Servicios

### identity-service (Puerto 3001)
- **Alcance**: Gestión de identidad digital, autenticación, autorización
- **Responsabilidades**: Login, registro, MFA, OAuth2/OIDC, RBAC/ABAC, emisión de tokens JWT/COSE
- **Tecnología**: ES256/EdDSA, PKCE obligatorio, biometría opcional

### user-profiles-service (Puerto 3002)
- **Alcance**: Perfiles de usuario, roles por condominio, estructura organizacional
- **Responsabilidades**: CRUD de perfiles, gestión de relaciones, Junta Directiva, Comités
- **Integración**: Fuente canónica de datos de usuario para otros servicios

### tenancy-service (Puerto 3003)
- **Alcance**: Ciclo de vida de condominios, unidades, alícuotas
- **Responsabilidades**: Creación de tenants, cálculo de alícuotas, aislamiento de datos
- **Multi-tenant**: Shared Database, Shared Schema con RLS

### notifications-service (Puerto 3005)
- **Alcance**: Envío multicanal de notificaciones, Event Schema Registry
- **Responsabilidades**: Email, SMS, push, plantillas, muro de noticias, códigos de verificación
- **Integración**: Registro y validación de esquemas de eventos para todo el sistema

### documents-service (Puerto 3006)
- **Alcance**: Gestión de documentos legales, almacenamiento, firma electrónica
- **Responsabilidades**: Generación desde plantillas, actas, contratos, integraciones externas
- **Seguridad**: Cifrado AES-256, hash de verificación, auditoría inmutable

## Dependencias

Estos servicios son la base del sistema y son consumidos por servicios de otras capas:
- `governance/` depende de core para identidad y perfiles.
- `operations/` depende de core para tenancy y documentos.
- `business/` depende de core para notificaciones y perfiles.

## Patrones Comunes

- **Multi-tenant**: Todos implementan aislamiento por `condominium_id` con RLS activo.
- **Event-driven**: Publican eventos de dominio vía Kafka.
- **API-first**: Contratos OpenAPI versionados.
- **Observabilidad**: Métricas, logs y trazas estándar.

Consulta políticas globales y lineamientos en [../../doc/POLICY_INDEX.md](../../doc/POLICY_INDEX.md).
