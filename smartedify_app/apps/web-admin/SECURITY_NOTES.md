# 🔒 Security Notes - Web Admin

**Policy-Version**: 1.0.0  
**Owner**: Security Team  
**Effective-Date**: 2025-01-01  
**Related-ADR**: ADR-0001-web-admin-security  
**Reference**: `/smartedify_app/doc/POLICY_INDEX.md`

---

## 📋 Resumen de Seguridad

El Web Admin implementa controles de seguridad enterprise-grade para proteger operaciones administrativas críticas en un entorno multi-tenant.

### **Principios de Seguridad**
- **Zero Trust**: Verificación continua de identidad y contexto
- **Defense in Depth**: Múltiples capas de protección
- **Least Privilege**: Acceso mínimo necesario por rol
- **Privacy by Design**: Minimización de datos y GDPR compliance
- **Audit Everything**: Trazabilidad completa de acciones

---

## 🔐 Autenticación y Autorización

### **JWT + DPoP Implementation**
```typescript
// Autenticación robusta con anti-replay
const authFlow = {
  login: 'JWT + MFA obligatorio',
  dpop: 'RFC 9449 para operaciones de escritura',
  refresh: 'Rotación automática de tokens',
  logout: 'Invalidación server-side',
};
```

### **Multi-Factor Authentication**
- **TOTP**: Google Authenticator, Authy
- **SMS**: Backup method con rate limiting
- **WebAuthn**: Hardware keys (YubiKey, etc.)
- **Biometric**: Touch ID, Face ID en dispositivos compatibles

### **Session Management**
```typescript
// Configuración de sesiones seguras
const sessionConfig = {
  duration: '8 hours max',
  refresh: 'Auto-refresh 5min antes de expirar',
  concurrent: 'Máximo 3 sesiones activas',
  timeout: 'Logout automático por inactividad (30min)',
};
```

---

## 🏢 Multi-Tenancy Security

### **Tenant Isolation**
```typescript
// Aislamiento estricto por tenant
const tenantSecurity = {
  context: 'Validación en cada request',
  rls: 'Row Level Security enforcement',
  ui: 'Indicadores visuales de contexto',
  switching: 'Re-autenticación para cambio de tenant',
};
```

### **Context Validation**
- **Header Validation**: X-Tenant-ID en cada request
- **JWT Claims**: tenant_id validado server-side
- **UI Indicators**: Tenant actual siempre visible
- **Audit Logging**: Cambios de contexto registrados

---

## 🍪 Cookies y Storage

### **Cookie Configuration**
```typescript
// Configuración segura de cookies
const cookiePolicy = {
  httpOnly: true,           // No accesible via JavaScript
  secure: true,             // Solo HTTPS
  sameSite: 'strict',       // CSRF protection
  domain: '.smartedify.com', // Subdomain sharing
  maxAge: 8 * 60 * 60,      // 8 hours
};
```

### **Local Storage Policy**
```typescript
// Datos permitidos en localStorage
const storagePolicy = {
  allowed: [
    'user_preferences',     // UI settings
    'tenant_context',       // Current tenant/condominium
    'feature_flags',        // Client-side flags
  ],
  forbidden: [
    'auth_tokens',          // Solo en httpOnly cookies
    'user_data',           // Solo en memory/server
    'sensitive_info',      // Nunca en client
  ],
};
```

---

## 🛡️ CSRF Protection

### **Double Submit Cookie Pattern**
```typescript
// Protección CSRF implementada
const csrfProtection = {
  token: 'Generado server-side por request',
  header: 'X-CSRF-Token requerido',
  validation: 'Comparación server-side',
  expiry: '1 hora máximo',
};
```

### **SameSite Cookies**
- **Strict**: Para cookies de autenticación
- **Lax**: Para cookies de preferencias
- **None**: Prohibido (no cross-site requests)

---

## 🔒 Content Security Policy

### **CSP Headers**
```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.smartedify.com wss://ws.smartedify.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### **Additional Security Headers**
```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## 🔍 Input Validation

### **Client-Side Validation**
```typescript
// Validación con Zod schemas
const userSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(2).max(100),
  roles: z.array(z.enum(['admin', 'manager', 'user'])),
});
```

### **Sanitization**
- **HTML**: DOMPurify para contenido dinámico
- **SQL**: Prepared statements (server-side)
- **XSS**: Escape automático en templates
- **Path Traversal**: Validación de rutas de archivos

---

## 🚫 Rate Limiting

### **Client-Side Limits**
```typescript
// Límites por operación
const rateLimits = {
  login: '5 intentos / 15 minutos',
  api_calls: '1000 requests / hora',
  file_upload: '10 archivos / minuto',
  password_reset: '3 intentos / hora',
};
```

### **Progressive Delays**
- **Failed Login**: Delay exponencial (1s, 2s, 4s, 8s...)
- **API Errors**: Backoff automático
- **Bulk Operations**: Throttling inteligente

---

## 📊 Audit Logging

### **Logged Events**
```typescript
// Eventos auditados automáticamente
const auditEvents = {
  auth: ['login', 'logout', 'mfa_challenge', 'password_change'],
  tenant: ['switch_tenant', 'switch_condominium'],
  users: ['create', 'update', 'delete', 'role_change'],
  data: ['export', 'import', 'bulk_operation'],
  admin: ['config_change', 'policy_update', 'system_access'],
};
```

### **Audit Data Structure**
```typescript
interface AuditLog {
  timestamp: string;
  userId: string;
  tenantId: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details: Record<string, any>;
  traceId: string;
}
```

---

## 🔐 Data Protection

### **PII Handling**
```typescript
// Manejo de datos personales
const piiPolicy = {
  collection: 'Mínimo necesario',
  display: 'Masking automático en UI',
  storage: 'Cifrado en reposo',
  transmission: 'TLS 1.3 obligatorio',
  retention: 'Según política de retención',
};
```

### **Data Minimization**
- **UI Fields**: Solo campos necesarios por rol
- **API Responses**: Proyecciones específicas
- **Logs**: Sin PII en logs de aplicación
- **Cache**: TTL corto para datos sensibles

---

## 🌐 Network Security

### **HTTPS Enforcement**
```typescript
// Configuración TLS
const tlsConfig = {
  version: 'TLS 1.3 mínimo',
  ciphers: 'Suite moderna solamente',
  hsts: 'max-age=31536000; includeSubDomains',
  redirect: 'HTTP → HTTPS automático',
};
```

### **API Communication**
- **mTLS**: Para service-to-service
- **Certificate Pinning**: En mobile apps
- **CORS**: Strict origin validation
- **Preflight**: OPTIONS requests validados

---

## 🚨 Incident Response

### **Security Monitoring**
```typescript
// Alertas automáticas
const securityAlerts = {
  failed_logins: '10+ intentos fallidos',
  privilege_escalation: 'Cambios de rol no autorizados',
  data_export: 'Exportaciones masivas',
  suspicious_activity: 'Patrones anómalos',
};
```

### **Response Procedures**
1. **Detection**: Alertas automáticas + monitoring
2. **Assessment**: Clasificación de severidad
3. **Containment**: Bloqueo automático si necesario
4. **Investigation**: Análisis de logs y trazas
5. **Recovery**: Restauración de servicios
6. **Lessons Learned**: Mejoras de seguridad

---

## 🔧 Security Testing

### **Automated Testing**
```bash
# Tests de seguridad automatizados
npm run test:security     # OWASP ZAP scan
npm run test:a11y        # Accessibility testing
npm run audit            # Dependency vulnerabilities
npm run lint:security    # ESLint security rules
```

### **Manual Testing**
- **Penetration Testing**: Trimestral
- **Code Review**: Obligatorio para cambios de seguridad
- **Threat Modeling**: Por feature nueva
- **Red Team**: Anual

---

## 📚 Compliance

### **Standards**
- **OWASP Top 10**: Mitigación completa
- **NIST Cybersecurity Framework**: Implementación
- **ISO 27001**: Controles aplicables
- **GDPR**: Privacy by design

### **Certifications**
- **SOC 2 Type II**: En progreso
- **ISO 27001**: Planificado 2025
- **PCI DSS**: Si procesamos pagos

---

## 🔄 Security Updates

### **Dependency Management**
```bash
# Actualizaciones de seguridad
npm audit                # Vulnerabilidades conocidas
npm update               # Patches de seguridad
npm run security-check   # Scan automatizado
```

### **Update Policy**
- **Critical**: Inmediato (<24h)
- **High**: Semanal
- **Medium**: Mensual
- **Low**: Trimestral

---

## 📞 Security Contacts

### **Reporting**
- **Security Issues**: security@smartedify.com
- **Vulnerabilities**: Ver `/SECURITY.md`
- **Incidents**: incident-response@smartedify.com
- **Privacy**: privacy@smartedify.com

### **Escalation**
1. **L1**: Development Team
2. **L2**: Security Team
3. **L3**: CISO
4. **L4**: Executive Team

---

## 📖 Related Documentation

- **Main Policy Index**: `/smartedify_app/doc/POLICY_INDEX.md`
- **Threat Model**: `/doc/security/THREAT_MODEL-web-admin.md`
- **Incident Response**: `/doc/runbooks/INCIDENT_RESPONSE.md`
- **Privacy Policy**: `/doc/security/PRIVACY_29733.md`
- **Crypto Policy**: `/doc/security/CRYPTO_POLICY.md`

---

**Última actualización**: 2025-01-01  
**Próxima revisión**: 2025-04-01  
**Aprobado por**: Security Team Lead