# Compliance Service

> **Puerto:** 3012  
> **Estado:** 🚧 **85% Implementado - Funcional**  
> **Versión:** 1.0.0  
> **Última Actualización:** 2025-01-01

Motor de Cumplimiento Normativo Global para SmartEdify. Implementa un Policy Decision Point (PDP) que evalúa políticas de negocio basadas en perfiles regulatorios por país, garantizando cumplimiento legal adaptativo multi-jurisdicción.

## 🎯 Alcance y Responsabilidades

### ✅ **Implementado (85%)**
- **Motor de Decisiones (PDP)** - Evalúa políticas determinísticamente
- **API Principal** - `/policies/evaluate` y `/policies/batch-evaluate`
- **Perfiles Regulatorios** - Por país (PE, CO, genérico) con reglas específicas
- **Validaciones Complejas** - Assembly, quorum, majority, reservations, DSAR
- **Multi-tenant** - Aislamiento por tenant/país con RLS
- **DSAR Orchestration** - Coordinación de eliminación cross-service
- **Observabilidad** - Health checks, eventos, métricas básicas
- **Seguridad** - JWT, Tenant, DPoP guards implementados

### ⚠️ **Pendiente (15%)**
- Base de datos y migraciones
- Tests unitarios y E2E
- Integración validada con governance-service

### 🔮 **Futuro (Diferido)**
- LLM Integration (Llama.cpp local)
- RAG System (vector DB + embeddings)
- Document Ingestion (PDF/OCR + ETL)
- Policy Compiler (LLM → JSON policies)

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- PostgreSQL 15+
- JWT token válido para autenticación

### Instalación
```bash
cd smartedify_app/services/governance/compliance-service

# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar migraciones (pendiente)
npm run db:migrate

# Iniciar en desarrollo
npm run start:dev
```

### Uso Básico
```bash
# Health check
curl http://localhost:3012/api/v1/health

# Evaluar política
curl -X POST http://localhost:3012/api/v1/policies/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "tenantId": "uuid",
    "countryCode": "PE",
    "action": "assembly:create",
    "resource": "assembly:uuid",
    "subject": {
      "userId": "uuid",
      "roles": ["OWNER"],
      "attributes": {"hasVotingRights": true}
    },
    "context": {
      "scheduledDate": "2025-02-15T10:00:00Z",
      "noticeDate": "2025-01-01T10:00:00Z",
      "modality": "MIXTA"
    }
  }'
```

## 📚 API Documentation

### Endpoints Principales

#### Policy Decision Point (PDP)
- `POST /api/v1/policies/evaluate` - Evaluar política individual
- `POST /api/v1/policies/batch-evaluate` - Evaluar múltiples políticas

#### Validaciones Legacy (Compatibilidad)
- `POST /api/v1/compliance/validate/assembly` - Validar asamblea
- `POST /api/v1/compliance/validate/quorum` - Validar quórum
- `POST /api/v1/compliance/validate/majority` - Validar mayoría

#### DSAR (Data Subject Access Rights)
- `POST /api/v1/dsar/orchestrate-deletion` - Orquestar eliminación cross-service
- `POST /api/v1/dsar/validate-retention` - Validar políticas de retención

#### Health & Observability
- `GET /api/v1/health` - Health check completo
- `GET /api/v1/health/live` - Liveness probe
- `GET /api/v1/health/ready` - Readiness probe

### Ejemplo de Respuesta PDP
```json
{
  "decision": "CONDITIONAL",
  "obligations": [{
    "type": "REQUIRES_APPROVAL",
    "description": "Assembly requires 15 days notice, but only 10 provided",
    "parameters": {
      "requiredDays": 15,
      "actualDays": 10
    }
  }],
  "reasons": ["Insufficient notice period - requires approval"],
  "policyRefs": ["regulatory_profile:assembly_rules"],
  "metadata": {
    "evaluatedAt": "2025-01-01T12:00:00Z",
    "processingTimeMs": 45,
    "rulesEvaluated": 3
  }
}
```

## 🏗️ Arquitectura

### Componentes Principales
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │────│    Services     │────│   Repositories │
│                 │    │                 │    │                 │
│ • Policies      │    │ • PDP Engine    │    │ • Policies      │
│ • Compliance    │    │ • Validation    │    │ • Profiles      │
│ • DSAR          │    │ • DSAR          │    │ • Validations   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Perfiles Regulatorios por País
- **Perú (PE)**: Ley 27157, 15 días aviso, quórum 60%/30%
- **Colombia (CO)**: Ley 675/2001, 10 días aviso, quórum 50%/25%
- **Genérico**: Estándares internacionales conservadores

### Tipos de Decisiones
- **PERMIT** - Acción permitida sin restricciones
- **DENY** - Acción denegada completamente
- **CONDITIONAL** - Acción permitida con obligaciones

## 🔗 Integraciones

### Servicios Consumidores
- **governance-service** - Validación de asambleas y votaciones
- **streaming-service** - Validación de métodos de asistencia
- **reservation-service** - Validación de reservas de áreas comunes
- **user-profiles-service** - Evaluación de permisos de usuario

### Dependencias
- **PostgreSQL** - Almacenamiento de políticas y perfiles
- **Kafka** - Eventos de validación y DSAR
- **identity-service** - Validación JWT

## 🛡️ Seguridad

### Autenticación y Autorización
- **JWT ES256/EdDSA** con validación de `kid`
- **DPoP** (RFC 9449) para operaciones de escritura
- **Multi-tenant** con aislamiento por `tenant_id`

### Políticas de Seguridad
- Rate limiting: 1000 req/15min por IP
- Timeout de evaluación: 5 segundos máximo
- Decisión por defecto: DENY (fail-closed)

## 📊 Observabilidad

### Métricas Clave
```
# Métricas de negocio
policy_evaluations_total{decision,country,action}
policy_evaluation_duration_seconds{country,action}
regulatory_profile_cache_hits_total

# Métricas técnicas  
http_requests_total{method,status,endpoint}
database_query_duration_seconds
```

### Health Checks
- **Database** - Conectividad PostgreSQL
- **Memory** - Uso de heap y RSS
- **Disk** - Espacio disponible

## 🧪 Testing

### Ejecutar Tests
```bash
# Tests unitarios
npm run test

# Tests con cobertura
npm run test:cov

# Tests E2E
npm run test:e2e
```

### Casos de Prueba Críticos
- Evaluación de políticas por país
- Validación multi-tenant
- Manejo de errores y timeouts
- Integración con servicios externos

## 🚀 Deployment

### Variables de Entorno Críticas
```bash
NODE_ENV=production
PORT=3012
DB_HOST=postgres-primary
DB_NAME=smartedify_compliance
JWT_SECRET=<secure-secret>
KAFKA_BROKERS=kafka-cluster:9092
```

### Kubernetes
```yaml
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

## 📋 Próximos Pasos

### Esta Semana (85% → 100%)
- [ ] Crear migraciones de base de datos
- [ ] Implementar tests unitarios básicos
- [ ] Validar integración con governance-service
- [ ] Configurar CI/CD pipeline

### Futuro (Funcionalidades Avanzadas)
- [ ] LLM Integration para policy compilation
- [ ] RAG System para document analysis
- [ ] Advanced observability y alertas
- [ ] Performance optimization

## 📞 Soporte

- **Equipo**: Governance Team
- **Documentación**: [POLICY_INDEX.md](../../../doc/POLICY_INDEX.md)
- **Especificación**: [compliance-service.md](../../../referencias/compliance-service.md)
- **Estado Global**: [SERVICES_IMPLEMENTATION_STATUS.md](../../../doc/SERVICES_IMPLEMENTATION_STATUS.md)

---

**Estado**: 🚧 **85% Implementado - Funcional para integraciones**  
**Próxima Revisión**: 2025-01-07  
**Objetivo**: 100% funcional para soporte completo de governance