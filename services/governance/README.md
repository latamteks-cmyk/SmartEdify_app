# SmartEdify Governance Services

Este directorio contiene los servicios de gobernanza de SmartEdify, incluyendo compliance y reservas, con integración completa de LLM local para interpretación de documentos y generación de políticas.

## Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Reservation    │    │   Compliance    │    │   LLM Stack     │
│   Service       │◄──►│    Service      │◄──►│                 │
│   (Port 3013)   │    │   (Port 3012)   │    │ • Llama.cpp     │
└─────────────────┘    └─────────────────┘    │ • Embeddings    │
         │                       │             │ • Vector DB     │
         │                       │             └─────────────────┘
         ▼                       ▼
┌─────────────────────────────────────────────┐
│            PostgreSQL Database              │
│     • Multi-tenant with RLS                │
│     • Vector extension (pgvector)          │
│     • GIST indexes for time ranges         │
└─────────────────────────────────────────────┘
```

## Servicios

### Compliance Service (Puerto 3012)

Servicio de cumplimiento que maneja:
- **Políticas**: Gestión de políticas ABAC/XACML
- **LLM Integration**: Compilación de documentos a políticas ejecutables
- **RAG**: Búsqueda semántica en documentos
- **Auditoría**: Logs WORM de todas las decisiones

#### Endpoints Principales:
- `POST /v1/policies/evaluate` - Evaluación de políticas
- `POST /v1/llm/policies/compile` - Compilación LLM de documentos
- `POST /v1/llm/policies/explain` - Explicación de decisiones con RAG
- `GET /v1/llm/rag/search` - Búsqueda semántica

### Reservation Service (Puerto 3013)

Servicio de reservas que maneja:
- **Reservas**: Creación y gestión de reservas de amenidades
- **Disponibilidad**: Consulta de slots disponibles
- **Integración**: Delegación a compliance-service para validación
- **Idempotencia**: Manejo de operaciones idempotentes con DPoP

#### Endpoints Principales:
- `POST /reservations` - Crear reserva (requiere DPoP)
- `GET /availability/{amenityId}` - Consultar disponibilidad
- `POST /reservations/{id}/check-in` - Validar asistencia

## Integración LLM Local

### Stack Tecnológico:
- **Llama.cpp**: Servidor LLM local (Llama 3 Instruct)
- **Text Embeddings Inference**: Embeddings multilingües (e5-small)
- **pgvector**: Base de datos vectorial en PostgreSQL
- **RAG Pipeline**: Chunking, embedding y búsqueda semántica

### Flujo de Compilación de Políticas:

1. **Ingesta de Documentos**:
   ```
   PDF/DOC → OCR → Chunking → Embeddings → Vector Store
   ```

2. **Compilación LLM**:
   ```
   Documentos → RAG Search → LLM Prompt → Policy JSON → Validación → PAP
   ```

3. **Evaluación en Tiempo Real**:
   ```
   Reservation Request → Compliance Check → Policy Decision → Allow/Deny
   ```

## Configuración y Despliegue

### Desarrollo Local

```bash
# Levantar stack completo
docker-compose -f docker-compose.governance.yml up -d

# Verificar servicios
curl http://localhost:3012/health  # Compliance
curl http://localhost:3013/health  # Reservation
curl http://localhost:8089/health  # Llama.cpp
curl http://localhost:8091/health  # Embeddings
```

### Variables de Entorno

#### Compliance Service:
```env
# Database
DB_HOST=postgres
DB_NAME=smartedify_governance
VECTOR_DB_URL=postgres://dev:devpass@postgres-vector:5432/compliance_rag

# LLM Services
LLM_BASE_URL=http://llama:8080
EMBEDDINGS_URL=http://embeddings:80

# Security
JWT_SECRET=your-jwt-secret
```

#### Reservation Service:
```env
# Database
DB_HOST=postgres
DB_NAME=smartedify_governance

# External Services
COMPLIANCE_SERVICE_URL=http://compliance-service:3012
COMPLIANCE_TIMEOUT_MS=2000

# Security
JWT_SECRET=your-jwt-secret
DPOP_SECRET=your-dpop-secret

# Features
FEATURE_WAITLIST=true
FEATURE_FEES=true
FEATURE_CHECK_IN=true
```

## Seguridad

### Multi-Tenancy:
- **Row Level Security (RLS)** en todas las tablas
- **Aislamiento por tenant_id** y **condominium_id**
- **Foreign Keys compuestas** para integridad referencial

### Autenticación:
- **JWT Bearer tokens** para autenticación
- **DPoP (RFC 9449)** para operaciones de escritura
- **Circuit breaker** para servicios externos

### Privacidad:
- **Sin PII** en logs de aplicación
- **Hashing** de datos sensibles en validaciones
- **Crypto-erase** para DSAR compliance

## Observabilidad

### Métricas (Prometheus):
```
# Compliance Service
compliance_policy_evaluations_total{decision,tenant}
compliance_llm_requests_total{operation,status}
compliance_rag_search_latency_seconds

# Reservation Service
reservations_created_total{status,tenant}
reservations_conflicts_total{tenant}
availability_requests_total{tenant}
```

### Trazas (OpenTelemetry):
- Propagación de `trace_id` entre servicios
- Atributos: `tenant_id`, `condominium_id`, `user_id`
- Spans para operaciones LLM y base de datos

### Dashboards (Grafana):
- **RED Metrics**: Rate, Errors, Duration
- **Business Metrics**: Reservas por tenant, uso de amenidades
- **LLM Metrics**: Latencia, tokens, grounding score

## Desarrollo

### Estructura de Directorios:
```
governance/
├── compliance-service/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── policies/     # Gestión de políticas
│   │   │   ├── compliance/   # Evaluación de cumplimiento
│   │   │   ├── llm/         # Integración LLM y RAG
│   │   │   └── dsar/        # Data Subject Access Rights
│   │   └── database/
│   │       └── migrations/   # Migraciones SQL
│   └── Dockerfile
├── reservation-service/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── reservations/ # Gestión de reservas
│   │   │   └── integrations/ # Integración con compliance
│   │   └── database/
│   │       └── migrations/   # Migraciones SQL
│   └── Dockerfile
└── docker-compose.governance.yml
```

### Testing:

```bash
# Unit tests
npm test

# Integration tests
npm run test:e2e

# Load testing
k6 run tests/load/reservation-load.js
```

## Criterios de Aceptación

### Funcionales:
- ✅ Compilación de documentos a políticas JSON válidas
- ✅ Evaluación determinista de políticas en <100ms P95
- ✅ Explicaciones RAG con citas a documentos fuente
- ✅ Reservas con validación de políticas integrada
- ✅ Idempotencia en operaciones críticas

### No Funcionales:
- ✅ Aislamiento multi-tenant validado
- ✅ Circuit breaker para resiliencia
- ✅ Observabilidad completa (métricas, trazas, logs)
- ✅ Cumplimiento GDPR (DSAR, crypto-erase)
- ✅ Performance: LLM <20s compile, <1.5s explain

### Seguridad:
- ✅ RLS activo en todas las tablas
- ✅ DPoP requerido para escrituras
- ✅ Sin PII en logs
- ✅ Auditoría WORM de decisiones LLM

## Roadmap

### Fase 1 (Actual):
- ✅ Infraestructura LLM local
- ✅ RAG pipeline básico
- ✅ Integración compliance-reservation

### Fase 2:
- [ ] Fine-tuning de modelos por tenant
- [ ] Optimización de embeddings
- [ ] Cache inteligente de políticas

### Fase 3:
- [ ] Multi-modal RAG (imágenes, audio)
- [ ] Políticas adaptativas con ML
- [ ] Compliance predictivo

---

Para más información, consultar:
- [Compliance Service Spec](../../referencias/compliance-service.md)
- [Reservation Service Spec](../../referencias/reservation-service.md)
- [Architecture Decision Records](../../docs/adr/)