# SmartEdify Web Admin

**Ubicación**: `/apps/web-admin/`  
**Puerto**: 3100  
**Tipo**: Next.js 14 (SSR/ISR) - UI Admin  
**Política**: `/apps/web-admin/SECURITY_NOTES.md`

---

## 📋 Descripción

Dashboard administrativo web para SmartEdify con funcionalidades completas de gestión multi-tenant, incluyendo:

- **Autenticación segura** con JWT + DPoP + MFA
- **Multi-tenancy visual** con context switching
- **Gestión de usuarios** y permisos granulares
- **Administración de condominios** completa
- **Reservas de amenidades** con políticas LLM
- **Gobernanza** (asambleas, votación, streaming)
- **Compliance** con explicaciones RAG
- **Finanzas** básicas y reportes

---

## 🚀 Inicio Rápido

### **Prerrequisitos**
```bash
# Node.js 18+ y npm 8+
node --version  # >= 18.0.0
npm --version   # >= 8.0.0

# Servicios backend ejecutándose
# Ver: /services/README.md
```

### **Instalación**
```bash
# Desde la raíz del monorepo
cd smartedify_app/apps/web-admin

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con URLs de servicios
```

### **Desarrollo**
```bash
# Iniciar en modo desarrollo
npm run dev

# Abrir en navegador
open http://localhost:3100
```

### **Producción**
```bash
# Build optimizado
npm run build

# Iniciar servidor de producción
npm start
```

---

## 🏗️ Arquitectura

### **Stack Tecnológico**
- **Framework**: Next.js 14 con App Router
- **UI**: Tailwind CSS + Headless UI
- **State**: Zustand + React Query
- **Forms**: React Hook Form + Zod
- **Auth**: Custom JWT + DPoP implementation
- **Charts**: Recharts + D3.js
- **Icons**: Heroicons + Lucide

### **Estructura de Directorios**
```
apps/web-admin/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth layouts
│   │   └── login/
│   ├── (dashboard)/       # Dashboard layouts
│   │   ├── dashboard/     # Main dashboard
│   │   ├── users/         # User management
│   │   ├── condominiums/  # Condominium admin
│   │   ├── reservations/  # Reservation management
│   │   ├── governance/    # Assembly & voting
│   │   ├── compliance/    # Policy management
│   │   └── finance/       # Financial reports
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   └── providers.tsx      # Context providers
├── components/
│   ├── ui/                # Base UI components
│   ├── forms/             # Form components
│   ├── dashboard/         # Dashboard widgets
│   └── layout/            # Layout components
├── lib/
│   ├── auth/              # Auth utilities & context
│   ├── tenant/            # Tenant context & API
│   ├── api/               # Service API clients
│   └── utils/             # Utility functions
├── types/                 # TypeScript definitions
├── public/                # Static assets
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # Tailwind configuration
└── package.json
```

---

## 🔒 Seguridad

### **Autenticación**
- **JWT tokens** con refresh automático
- **DPoP (RFC 9449)** para anti-replay
- **MFA obligatorio** para administradores
- **WebAuthn** support para hardware keys

### **Multi-tenancy**
- **Context switching** visual y seguro
- **RLS enforcement** a nivel UI
- **Tenant isolation** en todas las operaciones
- **Audit trails** completos

### **Headers de Seguridad**
```javascript
// Configurados en next.config.js
{
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': '...' // CSP estricto
}
```

---

## 🔌 Integración con Servicios

### **Servicios Core (100% Integrados)**
- **identity-service** (3001): Auth, MFA, WebAuthn
- **tenancy-service** (3003): Tenants, condominiums
- **user-profiles-service** (3002): Users, roles, permissions
- **notifications-service** (3005): Multi-channel notifications
- **documents-service** (3006): Document management

### **Servicios Governance (95% Integrados)**
- **governance-service** (3011): Assemblies, voting
- **streaming-service** (3014): Live video, transcription
- **compliance-service** (3012): Policies, LLM, RAG
- **reservation-service** (3013): Amenity bookings

### **Servicios Operations (Mocks Inteligentes)**
- **finance-service** (3007): 70% integrado, resto mock
- **asset-management-service** (3010): Mock con CRUD
- **physical-security-service** (3004): Mock dashboards
- **payroll-service** (3008): Mock forms
- **hr-compliance-service** (3009): Mock workflows

### **Servicios Business (Placeholders)**
- **marketplace-service** (3015): Mock catalog
- **analytics-service** (3016): Mock charts

---

## 🎨 UI/UX

### **Design System**
- **Responsive**: Mobile-first approach
- **Accessibility**: WCAG 2.1 AA compliant
- **Dark Mode**: System preference support
- **Multi-idioma**: ES/EN with i18n
- **Branding**: Per-tenant customization

### **Componentes Clave**
```typescript
// Dashboard widgets
<StatsCard />           // KPI cards with trends
<QuickActions />        // Contextual actions
<RecentActivity />      // Activity timeline
<SystemStatus />        // Service health

// Layout components
<DashboardLayout />     // Main layout with sidebar
<Sidebar />            // Navigation with role-based items
<Header />             // Top bar with user menu
<TenantIndicator />    // Current tenant context

// Form components
<UserForm />           // User CRUD with validation
<CondominiumForm />    // Condominium management
<ReservationForm />    // Booking wizard
<PolicyEditor />       // LLM-assisted policy editing
```

---

## 📊 Performance

### **Métricas Target**
- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **First Input Delay**: <100ms
- **Time to Interactive**: <3s

### **Optimizaciones**
- **Code splitting** automático por ruta
- **Image optimization** con Next.js Image
- **API caching** con React Query
- **Bundle analysis** con @next/bundle-analyzer
- **CDN delivery** para assets estáticos

---

## 🧪 Testing

### **Estrategia de Testing**
```bash
# Unit tests (Jest + Testing Library)
npm test

# E2E tests (Playwright)
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

### **Cobertura Target**
- **Unit tests**: >80% coverage
- **E2E tests**: Flujos críticos completos
- **Accessibility**: Automated a11y testing
- **Performance**: Lighthouse CI integration

---

## 🚀 Deployment

### **Entornos**
- **Development**: http://localhost:3100
- **Staging**: https://admin-stg.smartedify.com
- **Production**: https://admin.smartedify.com

### **CI/CD Pipeline**
```yaml
# .github/workflows/web-admin.yml
- Lint & Type Check
- Unit Tests
- Build & Bundle Analysis
- E2E Tests (Staging)
- Security Scan
- Deploy to Vercel/AWS
```

---

## 📚 Documentación Adicional

- **Security**: `/apps/web-admin/SECURITY_NOTES.md`
- **API Integration**: `/apps/web-admin/docs/API_INTEGRATION.md`
- **Component Library**: `/apps/web-admin/docs/COMPONENTS.md`
- **Deployment**: `/apps/web-admin/docs/DEPLOYMENT.md`

---

## 🤝 Contribución

Ver `/CONTRIBUTING.md` en la raíz del monorepo para:
- Estilo de código y commits
- Proceso de PR y revisión
- Testing requirements
- Security guidelines

---

## 📞 Soporte

- **Issues**: GitHub Issues con template
- **Security**: Ver `/SECURITY.md`
- **Runbooks**: `/doc/runbooks/`
- **Incident Response**: `/doc/runbooks/INCIDENT_RESPONSE.md`