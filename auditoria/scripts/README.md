# 🔧 Scripts de Auditoría SmartEdify

Este directorio contiene las herramientas automatizadas para el sistema de auditoría y seguimiento continuo de los servicios SmartEdify.

## 📋 Scripts Disponibles

### 1. `generate-metrics.js` - Generador de Métricas
Genera métricas de completitud y estado de servicios en tiempo real.

```bash
# Generar métricas en formato markdown
node generate-metrics.js --format markdown --output metrics-report.md

# Generar métricas en formato JSON
node generate-metrics.js --format json --output metrics-data.json

# Mostrar métricas en consola
node generate-metrics.js
```

**Características:**
- ✅ Métricas globales del ecosistema
- ✅ Análisis detallado por servicio
- ✅ Cálculo de health scores
- ✅ Generación de alertas automáticas
- ✅ Recomendaciones específicas por servicio
- ✅ Historial automático en `../history/`

### 2. `setup-alerts.js` - Sistema de Alertas
Configura y ejecuta alertas automáticas para cambios críticos.

```bash
# Ejecutar alertas en modo test
node setup-alerts.js --test

# Ejecutar alertas con configuración personalizada
node setup-alerts.js --config custom-alerts.json

# Ejecutar sistema de alertas continuo
node setup-alerts.js
```

**Características:**
- 🚨 Alertas críticas y de advertencia
- 📧 Notificaciones por email (simulado)
- 💬 Integración con Slack
- 🔗 Webhooks personalizables
- ⏰ Programación automática
- 🔇 Supresión de duplicados
- 📊 Reportes diarios y semanales

### 3. `generate-trends.js` - Análisis de Tendencias
Analiza tendencias históricas y genera proyecciones de progreso.

```bash
# Análisis de tendencias de 30 días
node generate-trends.js --period 30d --format markdown --output trends-30d.md

# Análisis de 7 días en JSON
node generate-trends.js --period 7d --format json --output trends-7d.json

# Análisis de 90 días
node generate-trends.js --period 90d
```

**Características:**
- 📈 Análisis de tendencias por servicio
- 🔮 Proyecciones futuras inteligentes
- 📊 Métricas de confianza
- 🎯 Fases de implementación proyectadas
- 📉 Detección de degradación
- 🌍 Tendencias globales del ecosistema

### 4. `run-audit-suite.js` - Suite Completo
Ejecuta el conjunto completo de herramientas de auditoría.

```bash
# Ejecución completa (métricas + alertas + tendencias)
node run-audit-suite.js --mode full

# Ejecución rápida (solo métricas)
node run-audit-suite.js --mode quick

# Solo alertas
node run-audit-suite.js --mode alerts

# Especificar directorio de salida
node run-audit-suite.js --mode full --output-dir /path/to/reports

# Mostrar configuración de scheduling
node run-audit-suite.js --show-schedule
```

**Modos de Ejecución:**
- **full**: Análisis completo con métricas, alertas y tendencias
- **quick**: Análisis rápido solo con métricas actuales  
- **alerts**: Solo procesamiento de alertas

## 📁 Estructura de Archivos Generados

```
auditoria/
├── scripts/                    # Scripts de automatización
├── reports/                    # Reportes generados
│   ├── metrics-YYYY-MM-DD.md   # Métricas en markdown
│   ├── metrics-YYYY-MM-DD.json # Métricas en JSON
│   ├── trends-7d-YYYY-MM-DD.md # Tendencias 7 días
│   ├── trends-30d-YYYY-MM-DD.md# Tendencias 30 días
│   └── consolidated-report.md   # Reporte consolidado
├── history/                    # Historial automático
│   ├── metrics-timestamp.json  # Métricas históricas
│   ├── trends-timestamp.json   # Análisis históricos
│   ├── alert-history.json      # Historial de alertas
│   └── email-timestamp.html    # Emails enviados (debug)
└── dashboard-metricas.md       # Dashboard principal
```

## ⚙️ Configuración

### Variables de Entorno

```bash
# Configuración SMTP para alertas por email
export SMTP_USER="alerts@smartedify.com"
export SMTP_PASS="your-password"

# Webhook de Slack
export SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# API Token para webhooks personalizados
export API_TOKEN="your-api-token"
export WEBHOOK_URL="https://api.smartedify.com/alerts"
```

### Configuración de Alertas

Crear `alerts-config.json`:

```json
{
  "thresholds": {
    "critical": {
      "completeness": 50,
      "healthScore": 40,
      "criticalIssues": 3
    },
    "warning": {
      "completeness": 80,
      "healthScore": 70,
      "criticalIssues": 1
    }
  },
  "channels": {
    "email": {
      "enabled": true,
      "recipients": ["dev-team@smartedify.com"]
    },
    "slack": {
      "enabled": true,
      "channel": "#smartedify-alerts"
    }
  }
}
```

## 🔄 Automatización con Cron

Para ejecutar automáticamente:

```bash
# Editar crontab
crontab -e

# Agregar las siguientes líneas:
# Análisis completo diario a las 8:00 AM
0 8 * * * cd /path/to/auditoria/scripts && node run-audit-suite.js --mode full

# Análisis rápido cada 4 horas
0 */4 * * * cd /path/to/auditoria/scripts && node run-audit-suite.js --mode quick

# Alertas cada 5 minutos
*/5 * * * * cd /path/to/auditoria/scripts && node run-audit-suite.js --mode alerts
```

## 📊 Métricas Generadas

### Métricas Globales
- Total de servicios analizados
- Servicios completamente funcionales
- Servicios con issues críticos
- Servicios listos para producción
- Completitud promedio del ecosistema
- Estado de integraciones cross-service

### Métricas por Servicio
- Completitud de funcionalidades (%)
- Health Score (0-100)
- Tendencia de progreso
- Issues críticos identificados
- Recomendaciones específicas
- Estado de arquitectura y seguridad

### Alertas Automáticas
- **CRITICAL**: Servicios con completitud < 50%
- **WARNING**: Servicios con completitud < 80%
- **INFO**: Reportes diarios y semanales

## 🎯 Casos de Uso

### 1. Monitoreo Diario
```bash
# Ejecutar análisis completo cada mañana
node run-audit-suite.js --mode full --output-dir daily-reports
```

### 2. CI/CD Integration
```bash
# En pipeline de CI/CD
node generate-metrics.js --format json > metrics.json
if [ $(jq '.alerts | length' metrics.json) -gt 0 ]; then
  echo "❌ Alertas críticas detectadas"
  exit 1
fi
```

### 3. Seguimiento de Proyecto
```bash
# Generar reporte de progreso semanal
node generate-trends.js --period 7d --format markdown --output weekly-progress.md
```

### 4. Alertas en Tiempo Real
```bash
# Monitoreo continuo
while true; do
  node setup-alerts.js --test
  sleep 300  # 5 minutos
done
```

## 🔧 Desarrollo y Extensión

### Agregar Nuevo Servicio

1. Editar `SERVICES_CONFIG` en `generate-metrics.js`:
```javascript
'nuevo-service': {
  name: 'Nuevo Service',
  port: 3020,
  priority: 'P1',
  completeness: 75,
  status: 'functional',
  // ... más configuración
}
```

2. Agregar proyecciones en `generate-trends.js`:
```javascript
'nuevo-service': {
  currentRate: 2,
  implementationRate: 10,
  phases: [
    { name: 'Implementación', duration: 14, progress: 25 }
  ]
}
```

### Agregar Nuevo Canal de Alertas

Extender `AlertManager` en `setup-alerts.js`:
```javascript
async sendCustomAlert(alert) {
  // Implementar nuevo canal
}
```

### Personalizar Métricas

Modificar `calculateHealthScore()` en `generate-metrics.js` para ajustar el algoritmo de scoring.

## 🐛 Troubleshooting

### Error: "Cannot find module"
```bash
# Instalar dependencias
npm install
```

### Error: "Permission denied"
```bash
# Dar permisos de ejecución
chmod +x *.js
```

### Alertas no se envían
1. Verificar variables de entorno
2. Comprobar configuración de red
3. Revisar logs en `../history/`

### Datos históricos faltantes
Los scripts generan datos sintéticos para demostración si no hay historial suficiente.

## 📞 Soporte

Para problemas o mejoras:
1. Revisar logs en `../history/`
2. Ejecutar en modo `--test` para debug
3. Verificar configuración de variables de entorno
4. Contactar al equipo de desarrollo

---

**Versión**: 1.0.0  
**Última Actualización**: 2025-01-10  
**Mantenido por**: Equipo SmartEdify