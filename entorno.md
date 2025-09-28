# 🌐 Entorno de Desarrollo - SmartEdify Platform

> **Estado del Proyecto**: Baseline Funcional ✅  
> **Fecha**: 28 de septiembre de 2025  
> **Versión**: 1.0.0-baseline  
> **Tests**: 34/34 E2E pasando (100%) 🎯

---

## 📊 **Estado Actual del Proyecto**

### **✅ Servicios Implementados y Funcionales**

| Servicio | Estado | Tests | Cobertura | Notas |
|----------|--------|-------|-----------|-------|
| **identity-service** | ✅ Producción Ready | 34/34 E2E ✅ | 100% | OAuth 2.0 + DPoP + WebAuthn completo |
| gateway-service | 🚧 En desarrollo | - | - | API Gateway principal |
| compliance-service | 📋 Planeado | - | - | Cumplimiento normativo |

### **🏗️ Arquitectura Implementada**

```
SmartEdify_A/Proyecto/
├── smartedify_app/
│   ├── services/
│   │   └── support/
│   │       └── identity-service/          ✅ COMPLETO
│   │           ├── src/                   # Código fuente
│   │           ├── test/                  # Tests E2E
│   │           ├── docker-compose.test.yml
│   │           └── package.json
│   └── shared/                            🚧 Por desarrollar
└── docs/                                  📋 Por crear
```

---

## 🚀 **Setup del Entorno de Desarrollo**

### **📋 Prerrequisitos**

```bash
# Software requerido
- Node.js 18.17.0+ (usar .nvmrc)
- npm 9.0+
- Docker 24.0+
- Docker Compose 2.0+
- PostgreSQL 14+ (para desarrollo local)
- Git 2.30+
```

### **⚡ Quick Start**

```bash
# 1. Clonar el repositorio
git clone [REPO-URL]
cd SmartEdify_A/Proyecto

# 2. Configurar Node.js
nvm use  # O nvm install si no tienes la versión

# 3. Instalar dependencias (identity-service)
cd smartedify_app/services/support/identity-service
npm install

# 4. Configurar entorno de testing
cp .env.example .env.test

# 5. Iniciar base de datos de pruebas (sandbox)
docker-compose -f docker-compose.test.yml up -d

# 6. Ejecutar tests para verificar setup
npm run test      # Tests unitarios
npm run test:e2e  # Tests E2E (debe mostrar 34/34 ✅)

# 7. Iniciar en modo desarrollo
npm run start:dev

# 8. Infra de pruebas
# Reusar docker-compose.test.yml para sandbox y scripts de arranque
```

### **🐳 Comandos Docker Esenciales**

```bash
# Base de datos de testing
docker-compose -f docker-compose.test.yml up -d    # Iniciar
docker-compose -f docker-compose.test.yml down -v  # Parar y limpiar

# Verificar estado de servicios
docker-compose ps

# Ver logs
docker-compose logs -f postgres-test

# Reiniciar completamente
docker-compose -f docker-compose.test.yml down -v && \
docker-compose -f docker-compose.test.yml up -d
```

---

## �️ **SEGURIDAD ENTERPRISE**


### **Estado Actual del Proyecto ✅**
- **OAuth 2.0 + DPoP**: Implementado y funcional (27/27 pruebas unitarias pasan)
- **WebAuthn**: Autenticación biométrica implementada  
- **JWT con JWK ES256/EdDSA**: Claves asimétricas, JWKS publicado, rotación con doble kid
- **Multi-tenancy**: Sistema de inquilinos implementado
- **PostgreSQL**: Base de datos con migraciones y seeds

> ⚡ **IMPORTANTE**: El identity-service está 100% operativo. Las siguientes prácticas son obligatorias para baseline enterprise.

### **Prácticas de Seguridad y Compliance (Obligatorias)**

#### **1. Gestión de Claves JWK ES256/EdDSA y JWKS**
```bash
# Sustituir JWT_SECRET por JWK ES256/EdDSA
# Publicar JWKS endpoint (/.well-known/jwks.json)
# Rotación automática con doble kid (ver src/modules/keys/services/key-rotation.service.ts)
# El repo y CI deben usar claves JWK, nunca JWT_SECRET
```

#### **2. Contracts-First Development (Gate de CI)**
```bash
# Contracts-first es obligatorio: ningún PR puede mergear código sin OpenAPI/AsyncAPI actualizado
npm install --save-dev @nestjs/swagger swagger-ui-express
npm install --save-dev @asyncapi/generator @asyncapi/html-template
# Validar en CI que los contratos estén actualizados antes de build/test
```

#### **3. Supply Chain Security (Obligatorio)**
```bash
# Análisis de vulnerabilidades y verificación de integridad en CI
npm install --save-dev npm-audit-resolver retire
npm install --save-dev lockfile-lint
```

#### **4. Multi-tenancy con Row Level Security (Mejora)**
```sql
-- El multi-tenancy ya está implementado a nivel de aplicación
-- RLS en PostgreSQL puede activarse para mayor aislamiento
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_tenant_isolation ON users
  USING (tenant_id = current_setting('myapp.current_tenant_id')::uuid);
```

#### **5. Observabilidad Enterprise (Obligatorio)**
```bash
# Mantener métricas y health ya expuestos
# Añadir trazas OTel para login y token
npm install --save @opentelemetry/api @opentelemetry/auto-instrumentations-node
# prom-client ya configurado para Prometheus
```

### **Implementación Segura de Cambios**

**Antes de aplicar cualquier cambio:**
1. ✅ **Validar estado actual**: `npm test` y `npm run test:e2e` (debe mostrar 27/27 y 34/34 tests pasando)
2. ✅ **Backup de base de datos**: Crear respaldo antes de cambios
3. ✅ **Rama separada**: Crear feature branch para cada ajuste
4. ✅ **Testing**: Validar que los cambios no rompan funcionalidad existente
5. ✅ **Contracts-first**: Validar contratos OpenAPI/AsyncAPI en CI antes de merge
6. ✅ **Claves JWK**: Nunca exponer JWT_SECRET en .env ni en CI
7. ✅ **Observabilidad**: Validar métricas y trazas OTel en login/token
8. ✅ **Gateway mínimo**: Levantar gateway-service con /auth/*, JWT/DPoP y rate-limits
9. ✅ **Portal auth-only**: Configurar PKCE y endpoints OIDC del identity

**Proceso recomendado:**
```bash
# 1. Validar estado actual
npm test && npm run test:e2e

# 2. Crear rama para ajuste específico
git checkout -b feature/jwk-rotation

# 3. Implementar cambio
# 4. Validar que todos los tests sigan pasando
# 5. PR con revisión de código y validación de contratos
```

---

## �📋 **PLAN DE MIGRACIÓN A GITHUB**

### **🎯 FASE 1: Preparación del Repositorio (Días 1-2)**

#### **Archivos a crear en el directorio raíz:**

```bash
# Configuración Git
.gitignore                    # ✅ Ver sección completa abajo
.gitattributes               # Configuración de archivos
README.md                    # ✅ Ver sección completa abajo
.nvmrc                       # Versión de Node.js

# Configuración de desarrollo
.editorconfig                # Configuración de editores
.eslintrc.json              # Linting
prettier.config.js          # Formateo de código
package.json                 # Scripts principales del monorepo

# Variables de entorno
.env.example                 # Template de variables
.env.development            # Desarrollo local
.env.test                   # Testing
```

#### **Estructura GitHub necesaria:**

```bash
.github/
├── workflows/
│   ├── ci.yml              # Pipeline principal
│   ├── tests.yml           # Testing automatizado
│   └── security.yml        # Análisis de seguridad
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml
│   ├── feature_request.yml
│   └── security.yml
├── PULL_REQUEST_TEMPLATE.md
└── CODEOWNERS              # Revisores automáticos
```

### **🔧 FASE 2: CI/CD y Automatización (Días 3-4)**

#### **Pipeline de CI/CD requerido:**

```yaml
# Workflow principal debe incluir:
- ✅ Setup Node.js 18.17.0
- ✅ Cache de dependencias npm
- ✅ Instalación de dependencias
- ✅ Linting y formateo
- ✅ Tests unitarios (27/27 debe pasar)
- ✅ Tests E2E (34/34 debe pasar)
- ✅ Build de producción
- ✅ Security scanning
- ✅ Docker build (si push a main)
```

#### **Configuración de ramas:**

```bash
main         # Producción - protegida
├── develop  # Desarrollo continuo
└── feature/* # Features individuales

# Branch protection rules:
- Require PR reviews (mínimo 1)
- Require status checks (CI debe pasar)
- Dismiss stale reviews
- Require branches to be up to date
```

### **📚 FASE 3: Documentación (Días 4-5)**

#### **Documentación técnica requerida:**

```markdown
docs/
├── ARCHITECTURE.md         # Arquitectura de microservicios
├── API.md                  # Documentación de APIs
├── DEPLOYMENT.md           # Guía de despliegue
├── CONTRIBUTING.md         # Guía de contribución
├── SECURITY.md             # Políticas de seguridad
└── CHANGELOG.md            # Historial de cambios
```

---

## 📄 **Archivos de Configuración**

### **1. `.gitignore` Completo**

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
.pnpm-debug.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
coverage/
*.tgz
*.tar.gz

# Runtime
*.pid
*.seed
*.pid.lock

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# IDEs
.vscode/settings.json
.idea/
*.swp
*.swo

# Testing
junit.xml
.nyc_output/

# Docker
.dockerignore
docker-compose.override.yml

# Database
*.db
*.sqlite
*.sqlite3
data/
pgdata/

# Keys and certificates
*.pem
*.key
*.crt
secrets/

# Temporary files
tmp/
temp/
.cache/
```

### **2. `.nvmrc`**

```
18.17.0
```

### **3. `package.json` (Raíz)**

```json
{
  "name": "smartedify-platform",
  "version": "1.0.0",
  "description": "Plataforma integral para comunidades inteligentes",
  "private": true,
  "workspaces": [
    "smartedify_app/services/*/*",
    "smartedify_app/shared/*"
  ],
  "scripts": {
    "dev": "npm run start:dev --workspace=identity-service",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "test:e2e": "npm run test:e2e --workspaces",
    "lint": "eslint . --ext .ts,.js --ignore-path .gitignore",
    "lint:fix": "npm run lint -- --fix",
    "format": "prettier --write \"**/*.{ts,js,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,js,json,md}\"",
    "clean": "rimraf dist coverage",
    "docker:test:up": "cd smartedify_app/services/support/identity-service && docker-compose -f docker-compose.test.yml up -d",
    "docker:test:down": "cd smartedify_app/services/support/identity-service && docker-compose -f docker-compose.test.yml down -v",
    "prepare": "husky install"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "eslint": "^8.50.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-import": "^2.28.0",
    "prettier": "^3.0.3",
    "husky": "^8.0.3",
    "lint-staged": "^14.0.1",
    "rimraf": "^5.0.1"
  },
  "lint-staged": {
    "*.{ts,js}": ["eslint --fix"],
    "*.{ts,js,json,md}": ["prettier --write"]
  },
  "engines": {
    "node": ">=18.17.0",
    "npm": ">=9.0.0"
  }
}
```

### **4. `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[*.{yml,yaml}]
indent_size = 2
```

### **5. `prettier.config.js`**

```javascript
module.exports = {
  semi: true,
  trailingComma: 'all',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  overrides: [
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
  ],
};
```

---

## 🧪 **Testing Strategy Implementada**

### **✅ Estado Actual de Tests (100% Funcional)**

```bash
Identity Service Tests:
├── Unit Tests: 27/27 ✅
│   ├── app.controller.spec.ts
│   ├── key-management.service.spec.ts
│   ├── key-rotation.service.spec.ts
│   ├── jwks.controller.spec.ts
│   └── tokens.service.spec.ts
│
└── E2E Tests: 34/34 ✅
    ├── app.e2e-spec.ts               # Health checks
    ├── auth.e2e-spec.ts              # Autenticación
    ├── webauthn.e2e-spec.ts          # WebAuthn/Passkeys
    ├── key-rotation.e2e-spec.ts      # Rotación de claves
    ├── tenant-isolation.e2e-spec.ts  # Multi-tenancy
    ├── oidc-discovery.e2e-spec.ts    # OIDC Discovery
    ├── device-flow.e2e-spec.ts       # Device Authorization
    ├── dpop.e2e-spec.ts              # DPoP Validation
    ├── dpop-replay.e2e-spec.ts       # Anti-replay
    ├── token-revocation.e2e-spec.ts  # Token Revocation
    ├── par.e2e-spec.ts               # Pushed Auth Requests
    ├── setup.e2e-spec.ts             # Setup global
    └── metrics.e2e-spec.ts           # Prometheus metrics
```

### **🎯 Coverage Goals**

```bash
# Metas de cobertura por servicio
Unit Tests: >90%
Integration Tests: >80%
E2E Tests: >95% de flujos críticos

# Métricas actuales identity-service:
Statements: >85%
Branches: >80%
Functions: >90%
Lines: >85%
```

---

## 🔒 **Configuración de Seguridad**

### **🛡️ Variables de Entorno Seguras**

```bash
# .env.example (template público)
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=smartedify_test
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# OAuth 2.0
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret

# WebAuthn
RP_ID=localhost
RP_NAME=SmartEdify
EXPECTED_ORIGIN=http://localhost:3001

# Testing
NODE_ENV=test
LOG_LEVEL=debug
```

### **🔐 GitHub Secrets Requeridos**

```bash
# Para CI/CD
DATABASE_URL                 # Para tests E2E
JWT_SECRET                  # Para generación de tokens
DOCKER_USERNAME             # Para build de imágenes
DOCKER_PASSWORD             # Para push de imágenes
CODECOV_TOKEN              # Para reportes de coverage
SONAR_TOKEN                # Para análisis de calidad
```

---

## 📊 **Monitoreo y Observabilidad**

### **✅ Métricas Implementadas**

```typescript
// Endpoint: GET /metrics (Prometheus format)
- process_cpu_user_seconds_total
- process_memory_usage_bytes
- nodejs_heap_space_size_used_bytes
- http_requests_total
- http_request_duration_seconds

// Health Checks implementados:
- GET /health           # Health básico
- GET /health/ready     # Readiness probe
- GET /health/live      # Liveness probe
```

### **🔍 Logging Strategy**

```bash
# Structured logging con Winston
LOG_LEVEL=debug|info|warn|error
LOG_FORMAT=json|simple

# Log categories implementadas:
- Authentication events
- Authorization failures  
- DPoP validation errors
- Token rotation events
- Security incidents
- Performance metrics
```

---

## 🚀 **Deployment Ready Checklist**

### **✅ Estado Actual (Baseline Ready)**

- [x] **Tests**: 34/34 E2E tests pasando
- [x] **Build**: Sin errores de TypeScript
- [x] **Docker**: Configurado y funcional
- [x] **Database**: Migraciones y schema correcto
- [x] **Security**: OAuth 2.0 + DPoP + WebAuthn
- [x] **Monitoring**: Health checks y métricas
- [x] **Documentation**: Código bien documentado

### **🎯 Próximos Pasos para Producción**

- [ ] **Environment configs**: dev/staging/prod
- [ ] **Secrets management**: Vault o similar
- [ ] **Load balancing**: Nginx o similar
- [ ] **SSL/TLS**: Certificados configurados
- [ ] **Monitoring**: Grafana + Prometheus
- [ ] **Logging**: Centralized logging (ELK)
- [ ] **Backup**: Automated database backups
- [ ] **Disaster recovery**: Plan documentado

---

## 🤝 **Flujo de Desarrollo Colaborativo**

### **🔄 Git Workflow Recomendado**

```bash
# 1. Feature development
git checkout develop
git pull origin develop
git checkout -b feature/nueva-funcionalidad

# 2. Development cycle
# - Hacer cambios
# - Ejecutar tests: npm run test && npm run test:e2e
# - Commit con mensajes claros
git add .
git commit -m "feat: nueva funcionalidad OAuth"

# 3. Pre-push validation
npm run lint:fix
npm run format
npm run test:e2e

# 4. Push and PR
git push origin feature/nueva-funcionalidad
# Crear Pull Request en GitHub

# 5. Code review y merge
# - Review por al menos 1 persona
# - CI debe pasar (34/34 tests)
# - Merge a develop
# - Deploy a staging para validación
```

### **📋 Commit Message Convention**

```bash
feat: nueva funcionalidad
fix: corrección de bug
docs: actualización de documentación
style: cambios de formato
refactor: refactorización de código
test: añadir o modificar tests
chore: tareas de mantenimiento

# Ejemplos:
feat(auth): implementar refresh token rotation
fix(dpop): corregir validación de claims htm/htu
docs(readme): actualizar guía de instalación
```

---

## 🎯 **Roadmap Técnico**

### **📅 Próximas 2 Semanas**

1. **GitHub Setup Completo**
   - Repositorio configurado
   - CI/CD funcionando
   - Branch protection

2. **Documentación Completa**
   - Architecture diagrams
   - API documentation
   - Deployment guides

3. **Security Hardening**
   - Dependency scanning
   - Security policies
   - Secrets management

### **📅 Próximo Mes**

1. **Scaling Preparation**
   - Load testing
   - Performance optimization
   - Horizontal scaling prep

2. **Additional Services**
   - Gateway service
   - Compliance service
   - Shared libraries

3. **Production Readiness**
   - Monitoring dashboards
   - Alerting rules
   - Disaster recovery

---

## ⚠️ **Puntos Críticos y Notas**

### **🚨 IMPORTANTES**

1. **Baseline Funcional Asegurado**: El estado actual con 34/34 tests E2E pasando representa un baseline estable y funcional.

2. **No Romper Tests**: Cualquier cambio debe mantener los 34 tests E2E pasando. Si un test falla, es blocker para merge.

3. **Database Migrations**: Cambios en schema deben incluir migrations y rollback procedures.

4. **Security First**: Toda nueva funcionalidad debe pasar security review y tests.

### **📝 Notas de Desarrollo**

- **Identity Service**: Completamente funcional, OAuth 2.0 + DPoP + WebAuthn ready
- **Test Database**: Usar siempre docker-compose.test.yml para consistencia
- **Environment**: NODE_ENV=test para tests, development para dev
- **Ports**: identity-service usa puerto 3001 por defecto

---

**🎯 Este entorno está listo para migrar a GitHub y comenzar desarrollo colaborativo profesional.**