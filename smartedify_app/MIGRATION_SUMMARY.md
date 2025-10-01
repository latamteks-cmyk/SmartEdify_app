# Migración de Estructura de Servicios - SCOPE v2.0

## Resumen de Cambios

Se ha actualizado la estructura de servicios para alinearse con el SCOPE v2.0, reorganizando los microservicios por líneas funcionales en lugar de líneas de negocio.

## Estructura Anterior vs Nueva

### Antes (Líneas de Negocio)
```
services/
├── pmv/                    # Línea 1 (PMV)
├── support/                # Línea 2 (Fundacionales)  
└── complementary/          # Línea 3 (Complementarios)
```

### Después (Líneas Funcionales)
```
services/
├── core/                   # Servicios fundamentales
├── governance/             # Servicios de gobernanza
├── operations/             # Servicios operativos
└── business/               # Servicios de negocio
```

## Mapeo de Servicios Migrados

### Core Services (3001-3006)
| Servicio Anterior | Servicio Nuevo | Puerto | Ubicación Nueva |
|------------------|----------------|--------|-----------------|
| `support/identity-service` | `identity-service` | 3001 | `core/identity-service` |
| `support/user-profiles-service` | `user-profiles-service` | 3002 | `core/user-profiles-service` |
| `support/tenancy-service` | `tenancy-service` | 3003 | `core/tenancy-service` |
| `support/communication-service` | `notifications-service` | 3005 | `core/notifications-service` |
| `support/document-service` | `documents-service` | 3006 | `core/documents-service` |

### Governance Services (3011-3014)
| Servicio Anterior | Servicio Nuevo | Puerto | Ubicación Nueva |
|------------------|----------------|--------|-----------------|
| `pmv/governance-service` | `governance-service` | 3011 | `governance/governance-service` |
| `complementary/compliance-service` | `compliance-service` | 3012 | `governance/compliance-service` |
| `pmv/reservation-service` | `reservation-service` | 3013 | `governance/reservation-service` |
| **NUEVO** | `streaming-service` | 3014 | `governance/streaming-service` |

### Operations Services (3004, 3007-3010)
| Servicio Anterior | Servicio Nuevo | Puerto | Ubicación Nueva |
|------------------|----------------|--------|-----------------|
| `complementary/facility-security-service` | `physical-security-service` | 3004 | `operations/physical-security-service` |
| `support/finance-service` | `finance-service` | 3007 | `operations/finance-service` |
| `complementary/payroll-service` | `payroll-service` | 3008 | `operations/payroll-service` |
| `complementary/certification-service` | `hr-compliance-service` | 3009 | `operations/hr-compliance-service` |
| `pmv/asset-management-service` | `asset-management-service` | 3010 | `operations/asset-management-service` |

### Business Services (3015-3016)
| Servicio Anterior | Servicio Nuevo | Puerto | Ubicación Nueva |
|------------------|----------------|--------|-----------------|
| **NUEVO** | `marketplace-service` | 3015 | `business/marketplace-service` |
| **NUEVO** | `analytics-service` | 3016 | `business/analytics-service` |

## Servicios Eliminados/No Migrados

Los siguientes servicios del esquema anterior no están en el SCOPE v2.0:
- `complementary/payments-service` - Funcionalidad integrada en `finance-service`
- `complementary/support-bot-service` - No incluido en SCOPE v2.0

## Nuevos Servicios Creados

### streaming-service (Puerto 3014)
- **Propósito**: Gestión de sesiones de video en vivo para asambleas híbridas
- **Separación**: Extraído del `governance-service` para cumplir SRP
- **Funcionalidades**: Google Meet, QR, biometría, transcripción, moderación

### marketplace-service (Puerto 3015)
- **Propósito**: Ecosistema de servicios premium para condominios
- **Modelo de Negocio**: Comisiones, suscripciones, certificaciones
- **Servicios**: Legales, mantenimiento, asesoría, seguros

### analytics-service (Puerto 3016)
- **Propósito**: Inteligencia de negocio y análisis predictivo
- **Tecnología**: ML, data warehouse, dashboards
- **Valor**: Insights, predicciones, optimización

## Cambios en POLICY_INDEX.md

Se actualizó la estructura de servicios en `/doc/POLICY_INDEX.md` para reflejar:
- Nueva organización por líneas funcionales
- Puertos específicos por servicio
- Descripción de responsabilidades
- Alineación con SCOPE v2.0

## Archivos Creados

### READMEs de Servicios Nuevos
- `services/governance/streaming-service/README.md`
- `services/business/marketplace-service/README.md`
- `services/business/analytics-service/README.md`

### READMEs de Agrupación
- `services/core/README.md`
- `services/governance/README.md`
- `services/operations/README.md`
- `services/business/README.md`

### Documentación Actualizada
- `services/README.md` - Estructura completa actualizada
- `doc/POLICY_INDEX.md` - Estructura de directorios actualizada

## Próximos Pasos

1. **Actualizar Contratos**: Revisar y actualizar contratos OpenAPI en `/contracts/openapi/`
2. **Configurar CI/CD**: Actualizar pipelines para nueva estructura
3. **Implementar Servicios Nuevos**: Desarrollar `streaming-service`, `marketplace-service`, `analytics-service`
4. **Migrar Configuraciones**: Actualizar configuraciones de deployment y networking
5. **Actualizar Documentación**: Revisar ADRs y diagramas de arquitectura

## Validación

- ✅ Estructura de directorios migrada
- ✅ Servicios reubicados correctamente
- ✅ READMEs creados para todos los servicios y agrupaciones
- ✅ POLICY_INDEX.md actualizado
- ✅ Puertos asignados según SCOPE v2.0
- ✅ Servicios nuevos documentados

La migración se completó exitosamente y la estructura ahora está alineada con el SCOPE v2.0.