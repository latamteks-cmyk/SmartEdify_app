# SmartEdify Streaming Service v2.2.0

Microservicio de streaming para la plataforma SmartEdify que gestiona sesiones de video seguras para asambleas híbridas (presencial/virtual/mixta), con integración criptográfica para validación de asistencia, transcripción, grabación y moderación.

## Características Principales

### 🎥 Gestión de Sesiones de Video
- Creación y administración de sesiones híbridas (virtual, presencial, mixta)
- Integración con múltiples proveedores de video (WebRTC, Google Meet, Zoom)
- Control de estados del ciclo de vida (programada, activa, completada, cancelada)
- Límites configurables de concurrencia y participantes por tenant

### 👥 Validación de Asistencia Multi-método
- **QR Contextual**: Códigos QR firmados con validación delegada al identity-service
- **Biometría**: Validación biométrica en tiempo real (nunca almacenada)
- **SMS/Email**: Códigos de verificación por canal digital
- **Registro Manual**: Registro presencial por moderadores autorizados
- Rate limiting y protección anti-replay

### 🎙️ Moderación en Tiempo Real
- WebSocket para comunicación bidireccional con renovación automática de tokens
- Sistema de solicitudes de palabra con prioridades
- Controles de moderación (mute/unmute, aprobación de intervenciones)
- Gestión de turnos de palabra con límites de tiempo

### 📝 Transcripción Automática
- Integración con Google Cloud Speech-to-Text y Whisper API
- Transcripción en tiempo real con confianza y timestamps
- Eventos versionados a Kafka para procesamiento downstream
- SLO de latencia ≤ 2s (P95)

### 🔒 Grabación y Auditoría Forense
- Grabación cifrada en S3 con AES-256
- Pruebas criptográficas (COSE/JWS) vinculando video con eventos de gobernanza
- Endpoint público de verificación de integridad sin PII
- Retención gobernada por políticas de compliance

### 🛡️ Seguridad y Multi-tenancy
- Autenticación JWT + DPoP obligatorio para escrituras
- mTLS para comunicación entre servicios internos
- Row Level Security (RLS) activo en todas las tablas
- Aislamiento completo por tenant con validación de límites

## Arquitectura Técnica

### Stack Tecnológico
- **Framework**: NestJS con TypeScript
- **Base de Datos**: PostgreSQL con TypeORM y RLS
- **Cache/Queue**: Redis + Bull para procesamiento asíncrono
- **Eventos**: Kafka para comunicación inter-servicios
- **WebSocket**: Socket.IO para moderación en tiempo real
- **Documentación**: Swagger/OpenAPI con esquemas DPoP
- **Contenedores**: Docker multi-stage con usuario no-root

### Estructura del Proyecto
```
src/
├── common/                 # Componentes compartidos
│   ├── decorators/        # Decoradores personalizados (TenantId, UserId)
│   ├── guards/           # Guards (JWT, DPoP, mTLS, Tenant)
│   ├── middleware/       # Middleware de tenant
│   └── services/         # Clientes de servicios externos
├── config/               # Configuraciones (DB, Redis, Kafka)
├── modules/              # Módulos de funcionalidad
│   ├── sessions/         # Gestión de sesiones de video
│   ├── attendance/       # Validación de asistencia multi-método
│   ├── moderation/       # Moderación y WebSocket
│   ├── transcription/    # Transcripción automática
│   ├── recording/        # Grabación y auditoría
│   └── video-providers/  # Adaptadores de proveedores de video
└── health/              # Health checks
```

## Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Kafka 2.8+
- Docker (opcional)

### Variables de Entorno
Copiar `.env.example` a `.env` y configurar:

```bash
# Application
NODE_ENV=development
PORT=3014
SERVICE_NAME=streaming-service

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=streaming_user
DATABASE_PASSWORD=streaming_pass
DATABASE_NAME=streaming_db

# Redis & Kafka
REDIS_HOST=localhost
KAFKA_BROKERS=localhost:9092

# JWT & Security
JWT_SECRET=streaming-super-secret-jwt-key

# Video Providers
GOOGLE_MEET_API_KEY=your-google-meet-key
ZOOM_API_KEY=your-zoom-key

# AWS S3 (Recordings)
AWS_REGION=us-east-1
S3_BUCKET_RECORDINGS=smartedify-recordings

# Service URLs
IDENTITY_SERVICE_URL=http://localhost:3001
GOVERNANCE_SERVICE_URL=http://localhost:3011
TENANCY_SERVICE_URL=http://localhost:3003
```

### Instalación Local
```bash
# Instalar dependencias
npm install

# Ejecutar migraciones
npm run migration:run

# Iniciar en desarrollo
npm run start:dev

# Iniciar en producción
npm run start:prod
```

### Docker
```bash
# Construir imagen
docker build -t streaming-service .

# Ejecutar contenedor
docker run -p 3014:3014 --env-file .env streaming-service
```

## API Endpoints

### Sesiones (`/api/v1/sessions`)
- `POST /sessions` - Crear sesión (solo servicios internos con mTLS)
- `GET /sessions` - Listar sesiones con filtros
- `GET /sessions/:id` - Obtener sesión específica
- `PATCH /sessions/:id` - Actualizar sesión
- `POST /sessions/:id/start` - Iniciar sesión
- `POST /sessions/:id/end` - Finalizar sesión (solo servicios internos)
- `POST /sessions/:id/cancel` - Cancelar sesión
- `GET /sessions/:id/recording-url` - URL temporal firmada de grabación
- `GET /sessions/:id/audit-proof` - Prueba de auditoría (público, sin PII)

### Asistencia (`/api/v1/sessions/:sessionId/attendance`)
- `POST /validate-qr` - Validar código QR (requiere DPoP)
- `POST /validate-biometric` - Validar biometría (requiere DPoP)
- `POST /validate-code` - Validar código SMS/Email (requiere DPoP)
- `POST /register-attendee` - Registro manual por moderador (requiere DPoP)
- `GET /` - Listar asistentes de la sesión
- `POST /:userId/mark-left` - Marcar asistente como ausente

### Moderación WebSocket (`/moderation`)
- **Conexión**: Requiere token JWT válido y sessionId
- **Eventos de entrada**:
  - `request_speech` - Solicitar palabra
  - `approve_speech` - Aprobar solicitud (solo moderadores)
  - `deny_speech` - Denegar solicitud (solo moderadores)
  - `mute_user` - Silenciar usuario (solo moderadores)
  - `unmute_user` - Activar audio (solo moderadores)
- **Eventos de salida**:
  - `speech_request_received` - Nueva solicitud de palabra
  - `speech_approved` - Solicitud aprobada
  - `speech_denied` - Solicitud denegada
  - `user_muted` - Usuario silenciado
  - `transcript_chunk` - Fragmento de transcripción

### Health Checks (`/api/v1/health`)
- `GET /health` - Estado general del servicio
- `GET /health/ready` - Verificación de preparación
- `GET /health/live` - Verificación de vida

## Integraciones con Servicios

### Identity Service (Puerto 3001)
- **Delegación Completa**: Validación de tokens contextuales (QR, biometría, códigos)
- **Endpoints Utilizados**:
  - `POST /v2/contextual-tokens/validate`
  - `POST /v2/biometric/validate`
  - `POST /v2/codes/validate`

### Governance Service (Puerto 3011)
- **Orquestación**: Recibe comandos de inicio/fin de sesión
- **Datos de Auditoría**: Proporciona merkle_root y commit_height
- **Notificaciones**: Recibe eventos de asistencia y transcripción

### Tenancy Service (Puerto 3003)
- **Límites**: Consulta límites de concurrencia y bitrate por tenant
- **Validación**: Verifica estado activo del tenant

## Seguridad y Cumplimiento

### Autenticación y Autorización
- **JWT + DPoP**: Obligatorio para todas las operaciones de escritura
- **mTLS**: Requerido para comunicación entre servicios internos
- **Rate Limiting**: 10 req/min por usuario, 100 req/min por tenant
- **Validación de Tokens**: Delegada completamente al identity-service

### Privacidad y Datos
- **Datos Biométricos**: Nunca almacenados, solo procesados en tiempo real
- **Hashing**: Todos los datos de validación se almacenan como SHA256
- **Geolocalización**: Solo si hay consentimiento explícito
- **Retención**: Gobernada por políticas del compliance-service

### Multi-tenancy
- **Row Level Security**: Activo en todas las tablas
- **Políticas RLS**: `tenant_id = current_setting('app.tenant_id')`
- **Índices Compuestos**: Optimizados para consultas por tenant
- **Aislamiento**: Validación de límites por tenant

## Observabilidad y Monitoreo

### Métricas (Prometheus)
- `sessions_started_total{tenant,modality}`
- `attendance_validated_total{method}`
- `transcript_chunks_emitted_total`
- `recording_duration_seconds_total`
- `moderation_actions_total{action}`
- `session_start_p95_seconds` (SLO: ≤5s)
- `transcription_latency_p95_seconds` (SLO: ≤2s)
- `ws_reconnect_p95_seconds` (SLO: ≤3s)

### Logs Estructurados
- **Formato**: JSON con timestamp, level, message, trace_id
- **Contexto**: tenant_id, session_id, user_id en todos los logs
- **Correlación**: trace_id propagado desde governance-service

### Health Checks
- **Database**: Conectividad PostgreSQL
- **Memory**: Uso de heap ≤ 150MB
- **Disk**: Uso de almacenamiento ≤ 90%
- **Readiness**: Solo conectividad de base de datos

## Desarrollo

### Scripts Disponibles
```bash
npm run start:dev      # Desarrollo con hot reload
npm run start:debug    # Desarrollo con debugger
npm run build          # Construir para producción
npm run test           # Ejecutar tests unitarios
npm run test:e2e       # Ejecutar tests end-to-end
npm run lint           # Linter de código
npm run format         # Formatear código
```

### Base de Datos
```bash
npm run migration:generate -- MigrationName  # Generar migración
npm run migration:run                        # Ejecutar migraciones
npm run migration:revert                     # Revertir migración
npm run schema:sync                          # Sincronizar esquema (solo desarrollo)
```

### Testing
```bash
# Tests unitarios
npm run test

# Tests con cobertura
npm run test:cov

# Tests end-to-end
npm run test:e2e

# Tests de WebSocket
npm run test:ws
```

## Deployment

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: streaming-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: streaming-service
  template:
    spec:
      containers:
      - name: streaming-service
        image: streaming-service:2.2.0
        ports:
        - containerPort: 3014
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/v1/health/live
            port: 3014
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health/ready
            port: 3014
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Escalamiento
- **Horizontal**: Stateless, puede escalar horizontalmente
- **WebSocket**: Usa Redis para sincronización entre instancias
- **Base de Datos**: Connection pooling configurado
- **Límites**: Configurables por tenant via tenancy-service

## Contribución

1. Fork del repositorio
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## Soporte

Para soporte técnico o preguntas:
- Email: dev@smartedify.com
- Slack: #streaming-service
- Issues: GitHub Issues

---

**Estado:** ✅ Listo para build freeze  
**Versión:** 2.2.0  
**Última actualización:** 2025-01-01