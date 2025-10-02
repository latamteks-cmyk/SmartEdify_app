# Documento de Requisitos - Auditoría y Validación de Servicios SmartEdify

## Introducción

Este documento establece los requisitos para realizar una auditoría completa y validación de alcances de los servicios principales de SmartEdify, específicamente governance-service, streaming-service, user-profiles-service, notifications-service y documents-service. La auditoría debe validar el estado actual de implementación contra las especificaciones mínimas definidas en las referencias y identificar brechas, inconsistencias y avances reales.

## Requisitos

### Requisito 1

**Historia de Usuario:** Como arquitecto de sistemas, quiero una auditoría completa del governance-service para validar su implementación actual contra las especificaciones de asambleas híbridas y gobernanza comunitaria.

#### Criterios de Aceptación

1. CUANDO se revise el governance-service ENTONCES el sistema DEBERÁ validar la implementación de gestión de asambleas híbridas (presencial/virtual/mixta)
2. CUANDO se analice el código fuente ENTONCES el sistema DEBERÁ verificar la implementación de votación ponderada por alícuotas
3. CUANDO se revise la base de datos ENTONCES el sistema DEBERÁ confirmar la existencia de tablas para assemblies, proposals, votes y session_attendees
4. CUANDO se valide la integración ENTONCES el sistema DEBERÁ verificar las conexiones con compliance-service, streaming-service y documents-service
5. CUANDO se revise la API ENTONCES el sistema DEBERÁ confirmar los endpoints para iniciativas de convocatoria y gestión de sesiones

### Requisito 2

**Historia de Usuario:** Como arquitecto de sistemas, quiero una auditoría del streaming-service para validar su capacidad de gestionar sesiones de video en tiempo real para asambleas híbridas.

#### Criterios de Aceptación

1. CUANDO se revise el streaming-service ENTONCES el sistema DEBERÁ validar la implementación de gestión de sesiones de video
2. CUANDO se analice la integración ENTONCES el sistema DEBERÁ verificar la delegación de validación de identidad al identity-service
3. CUANDO se revise la funcionalidad ENTONCES el sistema DEBERÁ confirmar la implementación de transcripción en tiempo real
4. CUANDO se valide la seguridad ENTONCES el sistema DEBERÁ verificar el cifrado de grabaciones y generación de sellos de auditoría
5. CUANDO se revise la moderación ENTONCES el sistema DEBERÁ confirmar los controles de moderación híbrida (automática + manual)

### Requisito 3

**Historia de Usuario:** Como arquitecto de sistemas, quiero una auditoría del user-profiles-service para validar la gestión de perfiles, membresías y roles por condominio.

#### Criterios de Aceptación

1. CUANDO se revise el user-profiles-service ENTONCES el sistema DEBERÁ validar la implementación de CRUD de perfiles por tenant
2. CUANDO se analice las membresías ENTONCES el sistema DEBERÁ verificar la gestión de relaciones persona-unidad (propietario, arrendatario, conviviente)
3. CUANDO se revise los roles ENTONCES el sistema DEBERÁ confirmar la definición de roles locales y entitlements modulares
4. CUANDO se valide la seguridad ENTONCES el sistema DEBERÁ verificar la implementación de RLS (Row Level Security)
5. CUANDO se revise la API ENTONCES el sistema DEBERÁ confirmar los endpoints de evaluación de permisos y gestión de consents

### Requisito 4

**Historia de Usuario:** Como arquitecto de sistemas, quiero una auditoría del notifications-service para validar su capacidad de envío multicanal y gestión de esquemas de eventos.

#### Criterios de Aceptación

1. CUANDO se revise el notifications-service ENTONCES el sistema DEBERÁ validar la implementación de envío multicanal (email, SMS, push)
2. CUANDO se analice el Event Schema Registry ENTONCES el sistema DEBERÁ verificar el registro y validación de esquemas de eventos
3. CUANDO se revise las plantillas ENTONCES el sistema DEBERÁ confirmar la gestión de plantillas de notificaciones
4. CUANDO se valide la integración ENTONCES el sistema DEBERÁ verificar el envío de códigos de verificación para validación de asistencia
5. CUANDO se revise el muro de noticias ENTONCES el sistema DEBERÁ confirmar la implementación del muro de noticias virtual

### Requisito 5

**Historia de Usuario:** Como arquitecto de sistemas, quiero una auditoría del documents-service para validar la gestión de documentos legales y flujos de firma electrónica.

#### Criterios de Aceptación

1. CUANDO se revise el documents-service ENTONCES el sistema DEBERÁ validar la implementación de almacenamiento seguro en S3
2. CUANDO se analice la generación ENTONCES el sistema DEBERÁ verificar la generación de documentos desde plantillas
3. CUANDO se revise la firma electrónica ENTONCES el sistema DEBERÁ confirmar la integración con proveedores de firma (Llama.pe)
4. CUANDO se valide las actas ENTONCES el sistema DEBERÁ verificar la generación automática de actas de asambleas
5. CUANDO se revise las evidencias ENTONCES el sistema DEBERÁ confirmar el manejo de adjuntos de evidencias (fotos de papeletas)

### Requisito 6

**Historia de Usuario:** Como arquitecto de sistemas, quiero una validación cruzada de la consistencia entre servicios para identificar dependencias faltantes o mal implementadas.

#### Criterios de Aceptación

1. CUANDO se valide la consistencia ENTONCES el sistema DEBERÁ verificar que las integraciones entre servicios estén correctamente implementadas
2. CUANDO se revise las APIs ENTONCES el sistema DEBERÁ confirmar que los contratos de API sean consistentes entre servicios
3. CUANDO se analice los eventos ENTONCES el sistema DEBERÁ verificar que los eventos emitidos y consumidos estén alineados
4. CUANDO se valide la seguridad ENTONCES el sistema DEBERÁ confirmar que todos los servicios implementen RLS y autenticación JWT
5. CUANDO se revise la documentación ENTONCES el sistema DEBERÁ identificar discrepancias entre la documentación y la implementación real

### Requisito 7

**Historia de Usuario:** Como arquitecto de sistemas, quiero un reporte detallado de brechas y recomendaciones para cada servicio auditado.

#### Criterios de Aceptación

1. CUANDO se complete la auditoría ENTONCES el sistema DEBERÁ generar un reporte de estado por cada servicio
2. CUANDO se identifiquen brechas ENTONCES el sistema DEBERÁ listar las funcionalidades faltantes o incompletas
3. CUANDO se detecten inconsistencias ENTONCES el sistema DEBERÁ documentar las discrepancias encontradas
4. CUANDO se evalúe el progreso ENTONCES el sistema DEBERÁ calcular el porcentaje de completitud por servicio
5. CUANDO se generen recomendaciones ENTONCES el sistema DEBERÁ priorizar las acciones correctivas por impacto y esfuerzo