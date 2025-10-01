# Notifications Service

> **Puerto:** 3005  
> **Estado:** ⚠️ **0% Implementado - Crítico**  
> **Prioridad:** 🔥 **ALTA** - Requerido por governance y streaming

## 🎯 Alcance y Responsabilidades

### Funcionalidad Requerida
- **Event Schema Registry** - Validación de esquemas Kafka para toda la plataforma
- **Notificaciones Multi-canal** - Email, SMS, push notifications
- **Códigos de Verificación** - SMS/Email para validación de asistencia
- **Plantillas Multi-idioma** - Convocatorias, recordatorios, alertas
- **Muro de Noticias** - Feed virtual para comunicaciones internas

### Integraciones Críticas
- **streaming-service** - Códigos SMS/Email para validación de asistencia
- **governance-service** - Convocatorias y recordatorios de asambleas
- **Kafka** - Event Schema Registry para validación de eventos
- **identity-service** - Contexto de usuario y preferencias

## 🚀 Próximos Pasos Inmediatos

### Esta Semana (0% → 80%)
```bash
cd smartedify_app/services/core/notifications-service

# 1. Crear estructura NestJS completa
# 2. Implementar Event Schema Registry para Kafka
# 3. Configurar proveedores (email, SMS, push)
# 4. Plantillas multi-idioma
# 5. Códigos de verificación (SMS/Email)
# 6. Muro de noticias virtual
```

### APIs Críticas Requeridas
```bash
# Event Schema Registry
POST /api/v1/schemas/register
GET /api/v1/schemas/{subject}/versions

# Notificaciones
POST /api/v1/notifications/send
POST /api/v1/notifications/bulk

# Códigos de verificación
POST /api/v1/codes/generate
POST /api/v1/codes/validate

# Plantillas
GET /api/v1/templates
POST /api/v1/templates
```

## 🚨 Impacto en Otros Servicios

**Sin notifications-service:**
- streaming-service no puede enviar códigos SMS/Email
- governance-service no puede enviar convocatorias
- Eventos Kafka sin validación de esquemas
- No hay comunicación proactiva con usuarios

**Tiempo estimado:** 1-2 semanas para funcionalidad básica

---

**Estado**: ⚠️ **CRÍTICO - Implementación requerida esta semana**  
**Bloquea**: streaming-service (códigos), governance-service (convocatorias)