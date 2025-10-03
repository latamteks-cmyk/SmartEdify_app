# Documents Service

> **Puerto:** 3006  
> **Estado:** ⚠️ **0% Implementado - Importante**  
> **Prioridad:** 🔥 **ALTA** - Requerido para actas legales

## 🎯 Alcance y Responsabilidades

### Funcionalidad Requerida

- **Generación de Actas** - Con IA (MCP) a partir de transcripciones
- **Almacenamiento S3** - Cifrado y versionado de documentos
- **Plantillas por País** - Formatos legales según jurisdicción
- **Firma Electrónica** - Presidente y Secretario de asamblea
- **Adjuntar Evidencias** - Fotos de papeletas físicas (votos presenciales)

### Integraciones Críticas

- **governance-service** - Transcripciones y datos de asambleas
- **streaming-service** - Metadatos de grabación y evidencias
- **compliance-service** - Validación de formatos legales por país
- **S3** - Almacenamiento seguro y cifrado

## 🚀 Próximos Pasos

### Semana 3-4 (0% → 80%)

```bash
cd smartedify_app/services/core/documents-service

# 1. Crear estructura NestJS completa
# 2. Integración con MCP para generación IA
# 3. Configurar S3 con cifrado
# 4. Plantillas por país (PE, CO, genérico)
# 5. Flujo de firma electrónica
# 6. API para adjuntar evidencias
```

### APIs Principales Requeridas

```bash
# Generación de documentos
POST /api/v1/documents/generate
GET /api/v1/documents/{id}
POST /api/v1/documents/{id}/sign

# Plantillas
GET /api/v1/templates/{country}
POST /api/v1/templates

# Evidencias
POST /api/v1/documents/{id}/attachments
GET /api/v1/documents/{id}/attachments
```

## 🚨 Impacto en Otros Servicios

**Sin documents-service:**

- governance-service no puede generar actas automáticamente
- No hay validez legal completa de asambleas
- Evidencias físicas no se pueden adjuntar
- Proceso manual de documentación

**Tiempo estimado:** 2-3 semanas para funcionalidad completa

---

**Estado**: ⚠️ **IMPORTANTE - Requerido para validez legal**  
**Bloquea**: governance-service (actas), streaming-service (evidencias)
