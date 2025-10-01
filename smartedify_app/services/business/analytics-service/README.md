# Analytics Service

> **Puerto:** 3016  
> **Alcance:** Inteligencia de negocio y dashboards para administradores

## Responsabilidades

- Ingesta de datos de todos los microservicios
- Dashboards de insights y KPIs
- Reportes personalizados ad-hoc
- Modelos predictivos con ML
- Data warehouse y ETL processes

## Integraciones

- **Todos los servicios**: Consumidor de eventos del sistema
- Data Warehouse: Amazon Redshift / Snowflake
- ML Platform: AWS SageMaker / Azure ML
- Visualization: Grafana / Tableau embedded

## Dashboards Principales

- **Participación**: Tasa por tipo de propietario (residente vs. no residente)
- **Votaciones**: Temas más votados y correlación con satisfacción
- **Predicciones**: Quórum esperado para próxima asamblea
- **Mantenimiento**: Eficiencia del gasto por tipo de activo
- **Financiero**: Predicción de morosidad y flujo de caja

## Endpoints Principales

- `GET /dashboards` - Lista de dashboards disponibles
- `GET /dashboards/{id}` - Dashboard específico con datos
- `POST /reports` - Generar reporte personalizado
- `GET /predictions/{type}` - Modelos predictivos
- `POST /insights` - Análisis de datos específicos

## Modelos ML

- Predicción de quórum basada en tendencias históricas
- Detección de riesgo de morosidad
- Optimización de gastos de mantenimiento
- Análisis de sentimiento en votaciones