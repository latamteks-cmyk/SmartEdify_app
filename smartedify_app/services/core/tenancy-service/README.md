# 🏢 SmartEdify Tenancy Service

**Puerto:** 3003 • **Versión:** 1.0.0 • **Estado:** ✅ Producción

Servicio core de SmartEdify responsable de la gestión de tenants, condominios, edificios y unidades. Actúa como fuente canónica de la estructura física y organizativa de cada comunidad.

## 🚀 Características

- Gestión completa de tenants, condominios, edificios y unidades.
- Estados del ciclo de vida (ACTIVE/SUSPENDED/CANCELLED).
- Operaciones bulk con validaciones masivas.
- Multi-tenancy con Row Level Security (RLS) y políticas por `tenant_id`/`condominium_id`.
- Publicación de eventos en Kafka para sincronización cross-service.
- API REST con OpenAPI 3.1 y respuestas RFC 7807.
- Health checks y observabilidad listas para Kubernetes.

## 🏗 Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│ Tenancy Service │────│   PostgreSQL    │
│   (Port 80/443) │    │   (Port 3003)   │    │   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               │
                      ┌─────────────────┐
                      │      Kafka      │
                      │   (Port 9092)   │
                      └─────────────────┘
```

## 📡 APIs Principales

```bash
POST   /api/v1/tenancy/tenants
GET    /api/v1/tenancy/tenants
POST   /api/v1/tenancy/tenants/{id}/deactivate
POST   /api/v1/tenancy/units
POST   /api/v1/tenancy/units/bulk/validate
POST   /api/v1/tenancy/units/bulk/execute
GET    /api/v1/tenancy/stats
```

## 🔐 Seguridad

- Verificación JWT mediante `identity-service`.
- Contexto de tenant establecido via `SET LOCAL app.tenant_id`.
- RLS activo con políticas estrictas por tabla.
- Auditoría con logs WORM y trazabilidad completa.

## 📈 Observabilidad

- Métricas de negocio y técnicas expuestas en `/metrics`.
- Logs estructurados enriquecidos con `tenant_id`, `unit_id` y `trace_id`.
- Trazas distribuidas via OpenTelemetry.

## 🔗 Integraciones

| Servicio                  | Estado |
|--------------------------|--------|
| identity-service         | ✅ 100% |
| governance-service       | ✅ 100% |
| streaming-service        | ✅ 100% |
| user-profiles-service    | 🚧 75% |
| finance-service          | ⚠️ 0%  |

## 📚 Documentación Adicional

- [Especificación Técnica](../../referencias/tenancy-service.md)
- [OpenAPI Contract](../../contracts/openapi/tenancy-service.v1.yaml)
- [Runbooks](../../doc/runbooks/)
- [ADRs](../../doc/adr/)

---

**Última actualización:** Enero 2025 • **Licencia:** Propietaria SmartEdify
