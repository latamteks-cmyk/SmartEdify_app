# Business Services

Servicios de negocio que generan valor agregado y nuevos flujos de ingresos para SmartEdify a través de servicios premium y análisis inteligente.

## Servicios

### marketplace-service (Puerto 3015)
- **Alcance**: Ecosistema de servicios premium para condominios
- **Responsabilidades**: Catálogo de proveedores, contratación, revisión legal, asesoría en vivo
- **Modelo de Negocio**: Comisiones (5-15%), suscripciones premium, certificación de proveedores
- **Servicios**: Legales, mantenimiento, asesoría contable, seguros, certificaciones

### analytics-service (Puerto 3016)
- **Alcance**: Inteligencia de negocio y análisis predictivo
- **Responsabilidades**: Dashboards, reportes ad-hoc, modelos ML, data warehouse
- **Valor**: Insights para administradores, predicciones, optimización de recursos
- **Tecnología**: AWS SageMaker/Azure ML, Redshift/Snowflake, Grafana embedded

## Propuesta de Valor

### Marketplace
- **Para Condominios**: Acceso a proveedores certificados, precios competitivos, calidad garantizada
- **Para Proveedores**: Canal de ventas, certificación de calidad, pagos seguros
- **Para SmartEdify**: Comisiones recurrentes, diferenciación competitiva, ecosystem lock-in

### Analytics
- **Administradores**: Dashboards ejecutivos, KPIs operativos, alertas predictivas
- **Juntas Directivas**: Reportes de gestión, análisis de tendencias, ROI de inversiones
- **SmartEdify**: Datos para product management, upselling inteligente, churn prevention

## Casos de Uso Clave

### Marketplace
1. **Revisión Legal de Actas**: Abogados certificados revisan actas generadas por MCP
2. **Asesoría en Vivo**: Abogado se une como observador en asamblea para consejos tiempo real
3. **Servicios de Mantenimiento**: Contratación de técnicos especializados
4. **Seguros Grupales**: Pólizas colectivas con descuentos por volumen

### Analytics
1. **Predicción de Quórum**: ML predice asistencia basada en histórico y tema
2. **Análisis de Morosidad**: Identifica patrones de riesgo de impago
3. **Optimización de Gastos**: Recomienda mejores momentos para mantenimiento
4. **Satisfacción del Propietario**: Correlaciona votaciones con sentiment analysis

## Integraciones

### Marketplace
- `governance-service`: Revisión de actas, asesoría en asambleas
- `finance-service`: Procesamiento de pagos, comisiones
- `asset-management-service`: Proveedores de mantenimiento
- `notifications-service`: Ofertas, alertas de servicios

### Analytics
- **Todos los servicios**: Consumidor universal de eventos
- `governance-service`: Datos de participación y votaciones
- `finance-service`: Métricas financieras y morosidad
- `asset-management-service`: Eficiencia de mantenimiento

## Modelos de Ingresos

### Marketplace
- **Comisión por Transacción**: 5-15% del valor del servicio contratado
- **Suscripción Premium**: $50-100/mes por acceso a servicios exclusivos
- **Certificación de Proveedores**: $500-2000/año por certificación y listing

### Analytics
- **Módulo Premium**: $30-50/mes por condominio para dashboards avanzados
- **Reportes Personalizados**: $100-500 por reporte ad-hoc
- **Consultoría de Datos**: $1000-5000 por proyecto de optimización

## Métricas de Éxito

### Marketplace
- **GMV** (Gross Merchandise Value): Valor total transaccionado
- **Take Rate**: % de comisión promedio
- **Proveedor NPS**: Satisfacción de proveedores
- **Repeat Purchase Rate**: Recontratación de servicios

### Analytics
- **Adoption Rate**: % de condominios usando analytics
- **Dashboard Engagement**: Tiempo promedio en dashboards
- **Prediction Accuracy**: Precisión de modelos ML
- **Cost Savings**: Ahorros generados por optimizaciones