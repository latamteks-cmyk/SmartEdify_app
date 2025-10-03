# Marketplace Service

> **Puerto:** 3015  
> **Alcance:** Ecosistema de servicios premium para condominios

## Responsabilidades

- Catálogo de servicios (legales, mantenimiento, asesoría, seguros)
- Flujos de contratación y cotización
- Revisión de actas por abogados certificados
- Asesoría legal en vivo durante asambleas
- Gestión de comisiones y pagos
- Integración con proveedores externos

## Integraciones

- `governance-service`: Revisión de actas generadas por MCP
- `finance-service`: Procesamiento de pagos y comisiones
- `notifications-service`: Alertas de ofertas y servicios
- `user-profiles-service`: Perfiles de administradores
- Proveedores externos: APIs de servicios legales y técnicos

## Endpoints Principales

- `GET /catalog` - Catálogo de servicios disponibles
- `POST /quotes` - Solicitar cotización
- `POST /contracts` - Contratar servicio
- `POST /legal-review` - Solicitar revisión legal de acta
- `POST /live-advisory` - Solicitar asesoría en vivo
- `GET /commissions` - Reporte de comisiones

## Modelo de Negocio

- Comisión por servicio contratado (5-15%)
- Suscripción premium para acceso a servicios exclusivos
- Certificación de proveedores con tarifa anual