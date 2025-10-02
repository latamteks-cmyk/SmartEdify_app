# 🔧 Ajuste de Estructura: Web Admin según POLICY_INDEX.md

**Fecha**: 2025-01-01  
**Motivo**: Cumplimiento con estructura estándar del monorepo SmartEdify  
**Referencia**: `/smartedify_app/doc/POLICY_INDEX.md`

---

## 📋 Estructura Actual vs Requerida

### ❌ **Estructura Actual (Incorrecta)**
```
smartedify_app/
├── web-admin/                    # ❌ Ubicación incorrecta
│   ├── package.json
│   ├── next.config.js
│   ├── app/
│   ├── components/
│   └── lib/
└── services/
    └── governance/
        ├── compliance-service/
        ├── reservation-service/
        └── finance-service/
```

### ✅ **Estructura Requerida (Correcta)**
```
smartedify_app/
├── apps/                         # ✅ Ubicación correcta
│   ├── web-admin/               # ✅ Next.js (SSR/ISR), UI Admin
│   ├── web-user/                # 🔄 Pendiente - Next.js, UI Usuario
│   ├── mobile/                  # 🔄 Pendiente - Expo/React Native
│   └── bff/
│       ├── admin/               # 🔄 Pendiente - BFF Admin (PKCE, CSRF, cache corto)
│       ├── app/                 # 🔄 Pendiente - BFF Usuario
│       └── mobile/              # 🔄 Pendiente - BFF Móvil
└── services/
    ├── core/                    # ✅ Servicios fundamentales
    ├── governance/              # ✅ Servicios de gobernanza
    ├── operations/              # 🔄 Pendiente - Servicios operativos
    └── business/                # 🔄 Pendiente - Servicios de negocio
```

---

## 🚀 Plan de Reorganización

### **Paso 1: Mover Web Admin a Apps**
```bash
# Comando de reorganización
mkdir -p smartedify_app/apps
mv smartedify_app/web-admin smartedify_app/apps/web-admin
```

### **Paso 2: Actualizar Referencias**
```typescript
// Actualizar package.json paths
{
  "name": "@smartedify/web-admin",
  "scripts": {
    "dev": "next dev -p 3100",
    "build": "next build",
    "start": "next start -p 3100"
  }
}
```

### **Paso 3: Ajustar Configuración**
```javascript
// apps/web-admin/next.config.js
const nextConfig = {
  // Ajustar paths relativos desde apps/web-admin/
  env: {
    GATEWAY_URL: process.env.GATEWAY_URL || 'http://localhost:8080',
    // ... resto de servicios
  }
};
```

---

## 📁 Estructura Final Completa

### **Apps Layer (Frontend & BFF)**
```
apps/
├── web-admin/                   # ✅ IMPLEMENTADO
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── condominiums/
│   │   │   ├── reservations/
│   │   │   ├── governance/
│   │   │   ├── compliance/
│   │   │   └── finance/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── providers.tsx
│   ├── components/
│   │   ├── ui/                  # Base components
│   │   ├── forms/               # Form components
│   │   ├── dashboard/           # Dashboard widgets
│   │   └── layout/              # Layout components
│   ├── lib/
│   │   ├── auth/                # Auth utilities
│   │   ├── tenant/              # Tenant context
│   │   ├── api/                 # API clients
│   │   └── utils/               # Utilities
│   └── types/                   # TypeScript definitions
├── web-user/                    # 🔄 PENDIENTE
├── mobile/                      # 🔄 PENDIENTE
└── bff/
    ├── admin/                   # 🔄 PENDIENTE
    ├── app/                     # 🔄 PENDIENTE
    └── mobile/                  # 🔄 PENDIENTE
```

### **Services Layer (Backend)**
```
services/
├── core/                        # ✅ IMPLEMENTADO
│   ├── identity-service/        # Puerto 3001 ✅
│   ├── user-profiles-service/   # Puerto 3002 ✅
│   ├── tenancy-service/         # Puerto 3003 ✅
│   ├── notifications-service/   # Puerto 3005 ✅
│   ├── documents-service/       # Puerto 3006 ✅
│   └── finance-service/         # Puerto 3007 🚧 70%
├── governance/                  # ✅ IMPLEMENTADO
│   ├── governance-service/      # Puerto 3011 ✅
│   ├── compliance-service/      # Puerto 3012 ✅ 95%
│   ├── reservation-service/     # Puerto 3013 ✅ 85%
│   └── streaming-service/       # Puerto 3014 ✅
├── operations/                  # 🔄 PENDIENTE
│   ├── physical-security-service/ # Puerto 3004
│   ├── asset-management-service/  # Puerto 3010
│   ├── payroll-service/           # Puerto 3008
│   └── hr-compliance-service/     # Puerto 3009
└── business/                    # 🔄 PENDIENTE
    ├── marketplace-service/     # Puerto 3015
    └── analytics-service/       # Puerto 3016
```

---

## 🔒 Políticas de Seguridad por Capa

### **Apps Layer Security**
```typescript
// apps/web-admin/SECURITY_NOTES.md
const SecurityPolicies = {
  cookies: 'httpOnly, secure, sameSite=strict',
  csrf: 'Double submit cookie pattern',
  csp: 'Strict CSP headers',
  navigation: 'Authenticated routes only',
  dpop: 'Required for state-changing operations',
  rls: 'Tenant context enforcement',
};
```

### **BFF Layer Security**
```typescript
// apps/bff/admin/BFF_POLICY.md
const BFFPolicies = {
  auth: 'PKCE flow for SPAs',
  cache: 'Short-lived cache (5min max)',
  shaping: 'Request/response transformation',
  rateLimit: 'Per-user and per-tenant limits',
  cors: 'Strict origin validation',
};
```

---

## 📊 Impacto de la Reorganización

### **Beneficios**
✅ **Cumplimiento**: Estructura estándar del monorepo  
✅ **Escalabilidad**: Separación clara frontend/backend  
✅ **Mantenibilidad**: Políticas específicas por capa  
✅ **Seguridad**: Controles granulares por aplicación  
✅ **CI/CD**: Pipelines independientes por app/service  

### **Cambios Mínimos Requeridos**
🔧 **Paths**: Actualizar imports relativos  
🔧 **Config**: Ajustar next.config.js  
🔧 **Scripts**: Actualizar package.json scripts  
🔧 **Docker**: Ajustar Dockerfile paths  

### **Sin Impacto Funcional**
✅ **Código**: Lógica de negocio sin cambios  
✅ **APIs**: Endpoints y contratos inalterados  
✅ **Base de Datos**: Schemas sin modificación  
✅ **Servicios**: Backend services sin cambios  

---

## 🎯 Comandos de Migración

### **1. Reorganización de Archivos**
```bash
# Crear estructura apps/
mkdir -p smartedify_app/apps

# Mover web-admin
mv smartedify_app/web-admin smartedify_app/apps/web-admin

# Crear directorios pendientes
mkdir -p smartedify_app/apps/web-user
mkdir -p smartedify_app/apps/mobile
mkdir -p smartedify_app/apps/bff/{admin,app,mobile}
```

### **2. Actualizar Package.json**
```json
{
  "name": "@smartedify/web-admin",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3100",
    "build": "next build",
    "start": "next start -p 3100"
  }
}
```

### **3. Ajustar Next.config.js**
```javascript
// apps/web-admin/next.config.js
const nextConfig = {
  // Paths ajustados desde apps/web-admin/
  async rewrites() {
    return [
      {
        source: '/api/services/:path*',
        destination: `${process.env.GATEWAY_URL || 'http://localhost:8080'}/:path*`,
      },
    ];
  },
};
```

---

## ✅ Checklist de Migración

### **Estructura**
- [ ] Mover `web-admin/` a `apps/web-admin/`
- [ ] Crear directorios `apps/web-user/`, `apps/mobile/`
- [ ] Crear directorios `apps/bff/{admin,app,mobile}/`
- [ ] Verificar estructura de `services/` existente

### **Configuración**
- [ ] Actualizar `package.json` con nuevo nombre
- [ ] Ajustar `next.config.js` paths
- [ ] Verificar `tailwind.config.js`
- [ ] Actualizar imports relativos si necesario

### **Documentación**
- [ ] Crear `apps/web-admin/SECURITY_NOTES.md`
- [ ] Crear `apps/web-admin/README.md`
- [ ] Actualizar documentación de arquitectura
- [ ] Verificar compliance con `POLICY_INDEX.md`

### **CI/CD**
- [ ] Ajustar workflows de GitHub Actions
- [ ] Actualizar Dockerfile paths
- [ ] Verificar docker-compose paths
- [ ] Actualizar scripts de deployment

---

## 🎯 Próximos Pasos Post-Reorganización

### **Inmediato (Esta semana)**
1. ✅ **Reorganizar estructura** según POLICY_INDEX.md
2. ✅ **Validar funcionamiento** del web-admin
3. ✅ **Actualizar documentación** y READMEs
4. ✅ **Verificar CI/CD** pipelines

### **Corto Plazo (Próximas 2 semanas)**
1. 🚀 **Implementar BFF Admin** para web-admin
2. 🚀 **Crear web-user** básico
3. 🚀 **Configurar platform/gateway** completo
4. 🚀 **Implementar observabilidad** cross-apps

### **Mediano Plazo (Próximo mes)**
1. 🎯 **Mobile app** con React Native
2. 🎯 **BFF completos** para todas las apps
3. 🎯 **Platform mesh** para service-to-service
4. 🎯 **Contracts** OpenAPI/AsyncAPI completos

La reorganización es **mínima y sin riesgo**, pero **esencial para el cumplimiento** de las políticas del monorepo y la **escalabilidad futura** del ecosistema SmartEdify.