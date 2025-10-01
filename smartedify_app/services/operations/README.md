# Operations Services

Servicios operativos que gestionan las operaciones diarias del condominio: finanzas, activos, seguridad, recursos humanos y nómina.

## Servicios

### finance-service (Puerto 3007)
- **Alcance**: Gestión financiera integral del condominio
- **Responsabilidades**: Cuotas de mantenimiento, conciliación bancaria, reportes PCGE/NIIF
- **Integración**: Proporciona datos de "propietarios habilitados" para quórum
- **Compliance**: Snapshot de alícuotas congelado al emitir convocatoria

### asset-management-service (Puerto 3010)
- **Alcance**: Inventario de activos y gestión de mantenimiento
- **Responsabilidades**: Jerarquía de activos, órdenes de trabajo, proveedores, KPIs
- **Tipos**: Activos duros (equipos) y blandos (software), áreas comunes
- **Mantenimiento**: Preventivo y correctivo, indicadores de disponibilidad

### physical-security-service (Puerto 3004)
- **Alcance**: Seguridad física del condominio
- **Responsabilidades**: CCTV, control de accesos (huella, facial), sensores IoT
- **Integración**: Hardware de seguridad, detección de amenazas, alertas tiempo real
- **Protocolos**: Gestión de riesgos, respuesta a incidentes

### payroll-service (Puerto 3008)
- **Alcance**: Cálculo y procesamiento de nóminas
- **Responsabilidades**: Salarios, beneficios, impuestos, PLAME (Perú)
- **Multi-país**: Formatos equivalentes por jurisdicción
- **Integración**: Conectado con finance-service para contabilización

### hr-compliance-service (Puerto 3009)
- **Alcance**: Gestión del ciclo de vida del empleado
- **Responsabilidades**: Contratos, evaluaciones, SST, comités, cumplimiento laboral
- **Compliance**: Normativas laborales por país, reportes de inspección
- **Riesgos**: Gestión de riesgos laborales, seguridad y salud en el trabajo

## Integraciones Operativas

### Con Core Services
- `tenancy-service`: Configuración por condominio
- `user-profiles-service`: Empleados y roles
- `documents-service`: Contratos, reportes, certificados
- `notifications-service`: Alertas operativas, recordatorios

### Con Governance Services
- `governance-service`: Datos financieros para quórum
- `reservation-service`: Áreas comunes como activos

### Con Business Services
- `marketplace-service`: Proveedores de servicios
- `analytics-service`: KPIs operativos, predicciones

## Flujos Operativos Clave

### Mantenimiento Predictivo
1. Sensores IoT reportan estado de activos
2. asset-management-service analiza patrones
3. Genera órdenes de trabajo preventivas
4. Integra con marketplace-service para proveedores

### Gestión Financiera
1. Cálculo automático de cuotas por alícuotas
2. Conciliación bancaria automatizada
3. Reportes contables (PCGE/NIIF)
4. Integración con governance para quórum

### Seguridad Integrada
1. Control de accesos biométrico
2. Monitoreo CCTV con IA
3. Alertas automáticas por sensores
4. Integración con streaming para asambleas

## Compliance y Auditoría

- **Financiero**: Reportes regulatorios por país
- **Laboral**: Cumplimiento normativo de RRHH
- **Seguridad**: Logs de acceso, auditoría de incidentes
- **Mantenimiento**: Trazabilidad de órdenes de trabajo