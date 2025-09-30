# Security Guidelines - SmartEdify Platform

## Overview

This document outlines the comprehensive security guidelines and implementation details for the SmartEdify platform, with a focus on the Identity Service's advanced security features.

## Authentication & Authorization

### OAuth 2.1 Security Best Practices

#### PKCE (Proof Key for Code Exchange)
**Implementation:** Mandatory for all authorization flows
```typescript
// PKCE validation in authorization flow
const codeChallenge = base64url(sha256(codeVerifier));
const codeChallengeMethod = 'S256';

// Validation during token exchange
if (!validatePKCE(codeVerifier, storedCodeChallenge)) {
  throw new UnauthorizedException('Invalid PKCE verification');
}
```

**Security Benefits:**
- Prevents authorization code interception attacks
- Protects against malicious apps on the same device
- Required for public clients and recommended for confidential clients

#### DPoP (Distributed Proof of Possession)
**Implementation:** Cryptographic binding of tokens to client keys
```typescript
// DPoP proof structure
{
  "typ": "dpop+jwt",
  "alg": "ES256",
  "jwk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "...",
    "y": "..."
  }
}

// Payload
{
  "jti": "unique-identifier",
  "htm": "POST",
  "htu": "https://identity.smartedify.com/oauth/token",
  "iat": 1640995200,
  "ath": "base64url(sha256(access_token))" // For resource server calls
}
```

**Security Benefits:**
- Prevents token theft and replay attacks
- Cryptographically binds tokens to client instances
- Provides sender authentication for API calls

#### Pushed Authorization Requests (PAR)
**Implementation:** Pre-registration of authorization parameters
```typescript
// PAR request
POST /oauth/par
{
  "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  "code_challenge_method": "S256",
  "redirect_uri": "https://client.example.com/callback",
  "scope": "openid profile"
}

// Response
{
  "request_uri": "urn:ietf:params:oauth:request_uri:6esc_11ACC5bwc014ltc14eY22c",
  "expires_in": 90
}
```

**Security Benefits:**
- Prevents parameter tampering during authorization
- Reduces attack surface by moving parameters server-side
- Enables complex authorization requests

### Multi-Factor Authentication

#### FIDO2/WebAuthn Implementation
**Registration Flow:**
```typescript
// Generate registration options
const options = await generateRegistrationOptions({
  rpName: 'SmartEdify',
  rpID: 'smartedify.com',
  userID: user.id,
  userName: user.email,
  attestationType: 'none',
  authenticatorSelection: {
    authenticatorAttachment: 'platform',
    userVerification: 'required'
  }
});
```

**Authentication Flow:**
```typescript
// Generate authentication options
const options = await generateAuthenticationOptions({
  rpID: 'smartedify.com',
  allowCredentials: userCredentials.map(cred => ({
    id: cred.credentialID,
    type: 'public-key'
  })),
  userVerification: 'required'
});
```

**Security Benefits:**
- Phishing-resistant authentication
- No shared secrets (passwords)
- Hardware-backed security
- Biometric authentication support

#### TOTP (Time-based One-Time Password)
**Implementation:**
```typescript
// Generate TOTP secret
const secret = authenticator.generateSecret();
const otpAuthUrl = authenticator.keyuri(
  user.email,
  'SmartEdify',
  secret
);

// Verify TOTP code
const isValid = authenticator.verify({
  token: userProvidedCode,
  secret: user.totpSecret
});
```

## Cryptographic Security

### Key Management

#### Automated Key Rotation
**Daily Rotation Schedule:**
```typescript
@Cron('0 2 * * *') // Daily at 2 AM
async handleKeyRotation() {
  const tenants = await this.getActiveTenants();
  
  for (const tenant of tenants) {
    const activeKey = await this.getActiveKey(tenant.id);
    
    if (this.shouldRotateKey(activeKey)) {
      await this.rotateKey(tenant.id);
    }
  }
}
```

**Key Lifecycle Management:**
```typescript
enum KeyStatus {
  ACTIVE = 'active',        // Current signing key
  ROLLED_OVER = 'rolled_over', // Previous key, still validates
  EXPIRED = 'expired'       // No longer used
}

// Key rotation process
async rotateKey(tenantId: string) {
  // 1. Generate new key
  const newKey = await this.generateSigningKey(tenantId);
  
  // 2. Mark current key as rolled over
  await this.markKeyAsRolledOver(tenantId);
  
  // 3. Activate new key
  await this.activateKey(newKey);
  
  // 4. Schedule cleanup of expired keys
  await this.scheduleKeyCleanup(tenantId);
}
```

#### Algorithm Support
**Supported Algorithms:**
- **ES256 (ECDSA P-256):** Primary algorithm for JWT signing
- **EdDSA (Ed25519):** Alternative algorithm for enhanced security
- **RS256:** Legacy support (deprecated for new implementations)

**Key Generation:**
```typescript
// ES256 key generation
const keyPair = await generateKeyPair('ES256', {
  namedCurve: 'P-256'
});

// EdDSA key generation
const keyPair = await generateKeyPair('EdDSA', {
  namedCurve: 'Ed25519'
});
```

### Token Security

#### JWT Structure and Claims
**Access Token Claims:**
```json
{
  "iss": "https://identity.smartedify.com",
  "sub": "user-uuid",
  "aud": "resource-server",
  "exp": 1640999800,
  "iat": 1640996200,
  "nbf": 1640996200,
  "jti": "token-uuid",
  "scope": "read write",
  "tenant_id": "tenant-uuid",
  "cnf": {
    "jkt": "dpop-key-thumbprint"
  }
}
```

**Refresh Token Security:**
```typescript
// Refresh token with family tracking
interface RefreshToken {
  id: string;
  userId: string;
  tenantId: string;
  tokenHash: string;      // SHA-256 hash of token
  familyId: string;       // Token family for rotation
  revoked: boolean;
  createdAt: Date;
  expiresAt: Date;
}

// Token rotation on use
async rotateRefreshToken(oldToken: string) {
  const tokenData = await this.validateRefreshToken(oldToken);
  
  // Revoke old token
  await this.revokeToken(oldToken);
  
  // Issue new token in same family
  return this.issueRefreshToken(
    tokenData.userId,
    tokenData.jkt,
    tokenData.familyId
  );
}
```

## Anti-Replay Protection

### DPoP Replay Prevention
**JTI Tracking Implementation:**
```typescript
interface DpopReplayProof {
  tenantId: string;
  jkt: string;           // Key thumbprint
  jti: string;           // Unique identifier
  iat: Date;             // Issued at time
  expiresAt: Date;       // Cleanup time
}

async validateDpopProof(proof: string, request: Request) {
  const payload = await this.verifyJWT(proof);
  
  // Check time window
  const now = Date.now();
  const iatTime = payload.iat * 1000;
  const maxSkew = this.configService.get('DPOP_MAX_IAT_SKEW_SECONDS') * 1000;
  
  if (Math.abs(now - iatTime) > maxSkew) {
    throw new UnauthorizedException('DPoP proof outside time window');
  }
  
  // Check for replay
  const existingProof = await this.jtiStore.get(payload.jti);
  if (existingProof) {
    throw new UnauthorizedException('DPoP proof replay detected');
  }
  
  // Store JTI for replay protection
  await this.jtiStore.register({
    tenantId: this.extractTenantId(request),
    jkt: payload.jkt,
    jti: payload.jti,
    iat: iatTime
  });
}
```

### Session Security
**Session Management:**
```typescript
// Secure session creation
async createSession(userId: string, metadata: SessionMetadata) {
  const session = new Session();
  session.id = uuid();
  session.userId = userId;
  session.tenantId = metadata.tenantId;
  session.sessionToken = await this.generateSecureToken();
  session.metadata = this.sanitizeMetadata(metadata);
  session.expiresAt = new Date(Date.now() + SESSION_LIFETIME);
  
  return this.sessionsRepository.save(session);
}

// Global logout implementation
async revokeUserSessions(userId: string, tenantId: string) {
  // Create revocation event
  const revocationEvent = new RevocationEvent();
  revocationEvent.userId = userId;
  revocationEvent.tenantId = tenantId;
  revocationEvent.revokedAt = new Date();
  
  await this.revocationEventsRepository.save(revocationEvent);
  
  // Publish logout event
  await this.publishLogoutEvent(userId, tenantId);
}
```

## Multi-Tenant Security

### Tenant Isolation
**Data Isolation:**
```typescript
// Tenant-aware repository base class
abstract class TenantAwareRepository<T> {
  protected addTenantFilter(query: SelectQueryBuilder<T>, tenantId: string) {
    return query.andWhere('entity.tenantId = :tenantId', { tenantId });
  }
  
  async findByTenant(tenantId: string, conditions: any = {}) {
    const query = this.repository.createQueryBuilder('entity');
    this.addTenantFilter(query, tenantId);
    
    Object.keys(conditions).forEach(key => {
      query.andWhere(`entity.${key} = :${key}`, { [key]: conditions[key] });
    });
    
    return query.getMany();
  }
}
```

**Cryptographic Isolation:**
```typescript
// Tenant-specific key management
async getActiveSigningKey(tenantId: string): Promise<SigningKey> {
  return this.signingKeyRepository.findOne({
    where: {
      tenantId,
      status: KeyStatus.ACTIVE
    }
  });
}

// JWKS endpoint with tenant isolation
async getJwksForTenant(tenantId: string) {
  const keys = await this.signingKeyRepository.find({
    where: {
      tenantId,
      status: In([KeyStatus.ACTIVE, KeyStatus.ROLLED_OVER])
    }
  });
  
  return {
    keys: keys.map(key => key.public_key_jwk)
  };
}
```

## Input Validation & Sanitization

### Request Validation
**DTO Validation:**
```typescript
// User creation DTO with validation
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  password: string;

  @IsUUID()
  @IsNotEmpty()
  tenantId: string;
}

// OAuth request validation
export class TokenRequestDto {
  @IsIn(['authorization_code', 'refresh_token', 'device_code'])
  grant_type: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/) // Base64url pattern
  code_verifier?: string;
}
```

### SQL Injection Prevention
**TypeORM Query Builder:**
```typescript
// Safe parameterized queries
async findUsersByTenant(tenantId: string, email?: string) {
  const query = this.usersRepository
    .createQueryBuilder('user')
    .where('user.tenantId = :tenantId', { tenantId });
  
  if (email) {
    query.andWhere('user.email = :email', { email });
  }
  
  return query.getMany();
}
```

## Error Handling & Information Disclosure

### Secure Error Responses
**Exception Filter:**
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = this.sanitizeErrorMessage(exception.message);
    }

    // Log full error details securely
    this.logger.error('Exception occurred', {
      error: exception,
      request: {
        method: request.method,
        url: request.url,
        userAgent: request.get('user-agent'),
        ip: request.ip
      }
    });

    // Return sanitized error to client
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url
    });
  }

  private sanitizeErrorMessage(message: string): string {
    // Remove sensitive information from error messages
    return message.replace(/password|secret|key|token/gi, '[REDACTED]');
  }
}
```

## Logging & Monitoring

### Security Event Logging
**Structured Security Logging:**
```typescript
// Authentication event logging
async logAuthenticationEvent(event: AuthenticationEvent) {
  this.logger.log('Authentication event', {
    eventType: event.type,
    userId: event.userId,
    tenantId: event.tenantId,
    clientId: event.clientId,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    success: event.success,
    failureReason: event.failureReason,
    timestamp: new Date().toISOString()
  });
  
  // Increment metrics
  this.metricsService.incrementCounter('auth_attempts_total', {
    result: event.success ? 'success' : 'failure',
    tenant: event.tenantId
  });
}

// Security alert for suspicious activity
async detectSuspiciousActivity(userId: string, tenantId: string) {
  const recentFailures = await this.getRecentFailedAttempts(userId);
  
  if (recentFailures.length > FAILURE_THRESHOLD) {
    this.logger.warn('Suspicious authentication activity detected', {
      userId,
      tenantId,
      failureCount: recentFailures.length,
      timeWindow: '5 minutes'
    });
    
    // Trigger security alert
    await this.securityAlertService.triggerAlert({
      type: 'BRUTE_FORCE_ATTEMPT',
      userId,
      tenantId,
      severity: 'HIGH'
    });
  }
}
```

## Compliance & Privacy

### GDPR Implementation
**Data Subject Rights:**
```typescript
// Data export (Right to Data Portability)
async exportUserData(userId: string, tenantId: string) {
  const userData = {
    profile: await this.usersService.findById(userId),
    sessions: await this.sessionsService.getUserSessions(userId),
    credentials: await this.webauthnService.getUserCredentials(userId),
    consents: await this.getConsentHistory(userId),
    auditLog: await this.getAuditLog(userId)
  };
  
  // Anonymize sensitive data
  return this.anonymizeExportData(userData);
}

// Data deletion (Right to be Forgotten)
async deleteUserData(userId: string, tenantId: string) {
  const job = await this.complianceService.createDeletionJob(userId, tenantId);
  
  // Coordinate deletion across services
  await this.publishDeletionEvent({
    jobId: job.id,
    userId,
    tenantId,
    services: ['identity', 'profile', 'analytics']
  });
  
  return job;
}
```

### Audit Trail
**Comprehensive Audit Logging:**
```typescript
// Audit event structure
interface AuditEvent {
  eventId: string;
  timestamp: Date;
  userId?: string;
  tenantId: string;
  action: string;
  resource: string;
  outcome: 'SUCCESS' | 'FAILURE';
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

// Audit decorator for sensitive operations
export function Audit(action: string, resource: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let outcome: 'SUCCESS' | 'FAILURE' = 'SUCCESS';
      let error: any = null;
      
      try {
        const result = await method.apply(this, args);
        return result;
      } catch (err) {
        outcome = 'FAILURE';
        error = err;
        throw err;
      } finally {
        await this.auditService.logEvent({
          action,
          resource,
          outcome,
          duration: Date.now() - startTime,
          error: error?.message,
          // Extract context from method arguments
          ...this.extractAuditContext(args)
        });
      }
    };
  };
}
```

## Security Testing

### Automated Security Testing
**Security Test Suite:**
```typescript
describe('Security Tests', () => {
  describe('DPoP Replay Protection', () => {
    it('should reject replayed DPoP proofs', async () => {
      const dpopProof = await createDpopProof('POST', '/oauth/token');
      
      // First request should succeed
      await request(app.getHttpServer())
        .post('/oauth/token')
        .set('DPoP', dpopProof)
        .expect(200);
      
      // Replay should fail
      await request(app.getHttpServer())
        .post('/oauth/token')
        .set('DPoP', dpopProof)
        .expect(401);
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow cross-tenant data access', async () => {
      const tenant1User = await createUser('tenant1');
      const tenant2Token = await getAccessToken('tenant2');
      
      await request(app.getHttpServer())
        .get(`/users/${tenant1User.id}`)
        .set('Authorization', `Bearer ${tenant2Token}`)
        .expect(403);
    });
  });
});
```

### Penetration Testing Checklist
- [ ] OAuth flow security (PKCE, state parameter)
- [ ] DPoP proof validation and replay protection
- [ ] JWT token validation and signature verification
- [ ] Session management and logout functionality
- [ ] Input validation and SQL injection prevention
- [ ] Cross-tenant data access controls
- [ ] Rate limiting and brute force protection
- [ ] Error message information disclosure
- [ ] Key rotation and cryptographic security

## Security Incident Response

### Incident Detection
**Automated Monitoring:**
```typescript
// Security metrics and alerting
class SecurityMonitoringService {
  @Cron('*/1 * * * *') // Every minute
  async checkSecurityMetrics() {
    const metrics = await this.getSecurityMetrics();
    
    // Check for anomalies
    if (metrics.failedAuthRate > FAILURE_RATE_THRESHOLD) {
      await this.triggerAlert('HIGH_FAILURE_RATE', metrics);
    }
    
    if (metrics.replayAttempts > REPLAY_THRESHOLD) {
      await this.triggerAlert('REPLAY_ATTACK_DETECTED', metrics);
    }
    
    if (metrics.suspiciousIPs.length > 0) {
      await this.triggerAlert('SUSPICIOUS_IP_ACTIVITY', metrics);
    }
  }
}
```

### Incident Response Procedures
1. **Detection:** Automated monitoring and alerting
2. **Assessment:** Determine severity and impact
3. **Containment:** Isolate affected systems/tenants
4. **Eradication:** Remove threat and vulnerabilities
5. **Recovery:** Restore normal operations
6. **Lessons Learned:** Post-incident review and improvements

This comprehensive security framework ensures the SmartEdify platform maintains the highest security standards while providing a seamless user experience.