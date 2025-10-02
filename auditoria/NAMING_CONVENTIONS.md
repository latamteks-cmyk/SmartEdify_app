# Convenciones de Nomenclatura - Auditoría SmartEdify

## Estructura de Carpetas

```
auditoria/
├── governance-service/          # Análisis del servicio de gobernanza
├── streaming-service/           # Análisis del servicio de streaming
├── user-profiles-service/       # Análisis del servicio de perfiles
├── notifications-service/       # Análisis del servicio de notificaciones
├── documents-service/           # Análisis del servicio de documentos
├── finance-service/             # Análisis del servicio financiero
├── asset-management-service/    # Análisis del servicio de activos
├── cross-service/              # Análisis cross-service y integraciones
├── reports/                    # Reportes consolidados
├── scripts/                    # Scripts de automatización
├── config/                     # Configuraciones
├── history/                    # Historial de métricas y alertas
├── cache/                      # Cache de resultados
└── logs/                       # Logs de ejecución
```

## Convenciones de Nombres de Archivos

### Análisis por Servicio
- **Formato**: `{service-name}-analysis-{version}.md`
- **Ejemplo**: `streaming-service-analysis-3.1.md`
- **Ubicación**: `auditoria/{service-name}/`

### Reportes de Estado
- **Formato**: `{service-name}-status-report-{date}.md`
- **Ejemplo**: `governance-service-status-report-2025-01-10.md`
- **Ubicación**: `auditoria/{service-name}/`

### Análisis Cross-Service
- **Formato**: `{topic}-analysis-report.md`
- **Ejemplo**: `kafka-events-analysis-report.md`
- **Ubicación**: `auditoria/cross-service/`

### Reportes Consolidados
- **Formato**: `consolidated-{type}-report-{date}.md`
- **Ejemplo**: `consolidated-audit-report-2025-01-10.md`
- **Ubicación**: `auditoria/reports/`

### Métricas y Dashboards
- **Formato**: `{type}-{timestamp}.{ext}`
- **Ejemplo**: `metrics-2025-01-10T15-30-00.json`
- **Ubicación**: `auditoria/history/`

## Versionado

### Análisis de Servicios
- **v1.0**: Análisis inicial básico
- **v2.0**: Análisis detallado con integraciones
- **v3.0**: Análisis completo con validación cross-service
- **v3.x**: Actualizaciones incrementales

### Reportes
- **Fecha**: YYYY-MM-DD para reportes diarios
- **Timestamp**: YYYY-MM-DDTHH-mm-ss para métricas automáticas

## Metadatos en Archivos

Cada archivo de análisis debe incluir:

```markdown
---
service: governance-service
version: 3.1
date: 2025-01-10
author: Audit System
status: completed
dependencies: [streaming-service, compliance-service]
---
```

## Categorías de Documentos

### Por Tipo
- **analysis**: Análisis técnico detallado
- **report**: Reporte ejecutivo o consolidado
- **status**: Estado actual de implementación
- **validation**: Validación de contratos/APIs
- **security**: Análisis de seguridad
- **integration**: Análisis de integraciones

### Por Audiencia
- **technical**: Documentos técnicos detallados
- **executive**: Reportes ejecutivos resumidos
- **operational**: Documentos operacionales
- **compliance**: Documentos de cumplimiento

## Ejemplos de Nombres Válidos

```
auditoria/
├── governance-service/
│   ├── governance-service-analysis-3.1.md
│   ├── governance-service-status-report-2025-01-10.md
│   └── governance-service-integration-validation.md
├── streaming-service/
│   ├── streaming-service-analysis-3.1.md
│   ├── streaming-service-analysis-3.2.md
│   └── streaming-service-security-analysis.md
├── cross-service/
│   ├── kafka-events-analysis-report.md
│   ├── api-contracts-validation-report.md
│   └── cross-service-security-analysis-report.md
└── reports/
    ├── consolidated-audit-report-2025-01-10.md
    ├── executive-summary-2025-01-10.md
    └── technical-recommendations-2025-01-10.md
```

## Reglas de Mantenimiento

1. **Archivos obsoletos**: Mover a `auditoria/history/archived/`
2. **Versiones antiguas**: Mantener última versión en carpeta principal
3. **Reportes temporales**: Limpiar automáticamente después de 30 días
4. **Cache**: Limpiar automáticamente después de 7 días

## Automatización

Los scripts en `auditoria/scripts/` seguirán estas convenciones automáticamente:
- Generación de nombres con timestamp
- Organización automática por tipo y servicio
- Limpieza automática de archivos temporales
- Versionado automático de análisis