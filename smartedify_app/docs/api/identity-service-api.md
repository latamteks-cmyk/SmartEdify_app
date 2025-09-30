# Identity Service API Documentation

## Overview

The SmartEdify Identity Service provides a comprehensive OAuth 2.1/OIDC implementation with advanced security features. This document provides detailed API usage examples and integration guidelines.

## Base URL

```
Production: https://identity.smartedify.com
Development: http://localhost:3000
```

## Authentication

### Client Authentication

All OAuth endpoints require client authentication using JWT client assertions:

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&
client_assertion=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...&
grant_type=authorization_code&
code=abc123&
code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

### DPoP (Distributed Proof of Possession)

Protected endpoints require DPoP proofs:

```http
POST /oauth/token
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiZjgzT0w3VGNkUzZQV1BpVGNZNGNlWWFfWWJiVGtTUzFKdGlZbXZUZ1VzIiwieSI6Ijc3aWRQNGY2VGZOdGVzNzFCUzNwOGVhUzFweDlmTVlRaUhPRHNrWGtSZUEifX0.eyJqdGkiOiJlMWozVl9iS2ljOC1MQUVCIiwiaHRtIjoiUE9TVCIsImh0dSI6Imh0dHBzOi8vc2VydmVyLmV4YW1wbGUuY29tL3Rva2VuIiwiaWF0IjoxNTYyMjYyNjE2fQ.2-GxA6T8lP4vfrg8v-FdDP23d01b4E4VTzaS9BaIiPvm...
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=abc123&
code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

## OAuth 2.1 Flows

### Authorization Code Flow with PKCE

#### 1. Generate PKCE Parameters

```javascript
// Client-side PKCE generation
function generatePKCE() {
  const codeVerifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const codeChallenge = base64url(sha256(codeVerifier));
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256'
  };
}
```

#### 2. Pushed Authorization Request (PAR)

```http
POST /oauth/par
Content-Type: application/x-www-form-urlencoded
Authorization: Basic Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ=

code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&
code_challenge_method=S256&
redirect_uri=https://client.example.com/callback&
scope=openid profile email&
state=xyz123
```

**Response:**
```json
{
  "request_uri": "urn:ietf:params:oauth:request_uri:6esc_11ACC5bwc014ltc14eY22c",
  "expires_in": 90
}
```

#### 3. Authorization Request

```http
GET /oauth/authorize?request_uri=urn:ietf:params:oauth:request_uri:6esc_11ACC5bwc014ltc14eY22c&client_id=client123&tenant_id=tenant-uuid
```

**Response:** Redirect to login page or callback with authorization code

#### 4. Token Exchange

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7...

grant_type=authorization_code&
code=abc123&
code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk&
client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&
client_assertion=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "8xLOxBtZp8",
  "token_type": "DPoP",
  "expires_in": 3600,
  "scope": "openid profile email"
}
```

### Device Authorization Flow

#### 1. Device Authorization Request

```http
POST /oauth/device_authorization
Content-Type: application/x-www-form-urlencoded
Authorization: Basic Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ=

scope=openid profile&
tenant_id=tenant-uuid
```

**Response:**
```json
{
  "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://identity.smartedify.com/device",
  "verification_uri_complete": "https://identity.smartedify.com/device?user_code=WDJB-MJHT",
  "expires_in": 1800,
  "interval": 5
}
```

#### 2. Token Polling

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7...

grant_type=urn:ietf:params:oauth:grant-type:device_code&
device_code=GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS&
client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&
client_assertion=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refresh Token Flow

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7...

grant_type=refresh_token&
refresh_token=8xLOxBtZp8&
client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&
client_assertion=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...
```

## WebAuthn/FIDO2 Integration

### Registration Flow

#### 1. Generate Registration Options

```http
GET /webauthn/registration/options?username=user@example.com&tenant_id=tenant-uuid
```

**Response:**
```json
{
  "challenge": "Y2hhbGxlbmdl",
  "rp": {
    "name": "SmartEdify",
    "id": "smartedify.com"
  },
  "user": {
    "id": "dXNlci1pZA",
    "name": "user@example.com",
    "displayName": "John Doe"
  },
  "pubKeyCredParams": [
    {"alg": -7, "type": "public-key"},
    {"alg": -257, "type": "public-key"}
  ],
  "authenticatorSelection": {
    "authenticatorAttachment": "platform",
    "userVerification": "required"
  },
  "timeout": 60000
}
```

#### 2. Verify Registration

```http
POST /webauthn/registration/verification
Content-Type: application/json
webauthn-challenge: Y2hhbGxlbmdl

{
  "id": "credential-id",
  "rawId": "Y3JlZGVudGlhbC1pZA",
  "response": {
    "attestationObject": "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVjESZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAK3OAAI1vMYKZIsLJfHwVQMAIGcuLUewjCujt8rG7yxaXy4hsNNlW4CeU8W5GjM5YiZdpQECAyYgASFYIGPMdO6cf_xQ2NuXV93cNMYzpBcAiDLVnPrjWCbKKZPiIlgg8YE7TOppuk7p_4z_c15dGnOcoxcOMXTkjG-kzBNbZps",
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiWTJoaGJHeGxibWRsIiwib3JpZ2luIjoiaHR0cHM6Ly9zbWFydGVkaWZ5LmNvbSIsImNyb3NzT3JpZ2luIjpmYWxzZX0"
  },
  "type": "public-key",
  "userId": "user-uuid"
}
```

### Authentication Flow

#### 1. Generate Authentication Options

```http
POST /webauthn/assertion/options
Content-Type: application/json

{
  "username": "user@example.com",
  "tenant_id": "tenant-uuid"
}
```

**Response:**
```json
{
  "challenge": "Y2hhbGxlbmdl",
  "timeout": 60000,
  "rpId": "smartedify.com",
  "allowCredentials": [
    {
      "id": "Y3JlZGVudGlhbC1pZA",
      "type": "public-key"
    }
  ],
  "userVerification": "required"
}
```

#### 2. Verify Authentication

```http
POST /webauthn/assertion/result
Content-Type: application/json
webauthn-challenge: Y2hhbGxlbmdl

{
  "id": "credential-id",
  "rawId": "Y3JlZGVudGlhbC1pZA",
  "response": {
    "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAQ",
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiWTJoaGJHeGxibWRsIiwib3JpZ2luIjoiaHR0cHM6Ly9zbWFydGVkaWZ5LmNvbSIsImNyb3NzT3JpZ2luIjpmYWxzZX0",
    "signature": "MEUCIQDTGVxhrLcrOdkGX..."
  },
  "type": "public-key"
}
```

## OIDC Discovery

### Configuration Endpoint

```http
GET /.well-known/openid-configuration?tenant_id=tenant-uuid
```

**Response:**
```json
{
  "issuer": "https://identity.smartedify.com",
  "authorization_endpoint": "https://identity.smartedify.com/oauth/authorize",
  "token_endpoint": "https://identity.smartedify.com/oauth/token",
  "jwks_uri": "https://identity.smartedify.com/.well-known/jwks.json?tenant_id=tenant-uuid",
  "pushed_authorization_request_endpoint": "https://identity.smartedify.com/oauth/par",
  "device_authorization_endpoint": "https://identity.smartedify.com/oauth/device_authorization",
  "revocation_endpoint": "https://identity.smartedify.com/oauth/revoke",
  "introspection_endpoint": "https://identity.smartedify.com/oauth/introspect",
  "response_types_supported": ["code"],
  "grant_types_supported": [
    "authorization_code",
    "refresh_token",
    "urn:ietf:params:oauth:grant-type:device_code"
  ],
  "code_challenge_methods_supported": ["S256"],
  "dpop_signing_alg_values_supported": ["ES256", "EdDSA"],
  "scopes_supported": ["openid", "profile", "email"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["ES256", "EdDSA"],
  "token_endpoint_auth_methods_supported": [
    "private_key_jwt"
  ],
  "require_pushed_authorization_requests": true
}
```

### JWKS Endpoint

```http
GET /.well-known/jwks.json?tenant_id=tenant-uuid
```

**Response:**
```json
{
  "keys": [
    {
      "kty": "EC",
      "use": "sig",
      "crv": "P-256",
      "kid": "key-id-1",
      "x": "f83OL7TcdS6PWPiTcY4ceYa_YbbTkSS1JtiYmvTgUs",
      "y": "77idP4f6TfNtes71BS3p8eaS1px9fMYQiHODskXkReA",
      "alg": "ES256"
    }
  ]
}
```

## Privacy & Compliance

### Data Export (DSAR)

```http
POST /privacy/export
Content-Type: application/json
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7...
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "user_id": "user-uuid",
  "tenant_id": "tenant-uuid",
  "format": "json",
  "include_services": ["identity", "profile", "analytics"]
}
```

**Response:**
```json
{
  "job_id": "export-job-uuid",
  "status": "processing",
  "created_at": "2024-01-15T10:30:00Z",
  "estimated_completion": "2024-01-15T10:35:00Z"
}
```

### Data Deletion (Right to be Forgotten)

```http
DELETE /privacy/data
Content-Type: application/json
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7...
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "user_id": "user-uuid",
  "tenant_id": "tenant-uuid",
  "verification_code": "123456",
  "reason": "User requested account deletion"
}
```

## Session Management

### Get Active Sessions

```http
GET /identity/v2/sessions/active?tenant_id=tenant-uuid
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "created_at": "2024-01-15T10:00:00Z",
      "last_activity": "2024-01-15T10:30:00Z",
      "device_info": {
        "user_agent": "Mozilla/5.0...",
        "ip_address": "192.168.1.1"
      }
    }
  ]
}
```

### Revoke Session

```http
POST /identity/v2/sessions/session-uuid/revoke
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Revoke All User Sessions

```http
POST /identity/v2/subject/revoke
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "user_id": "user-uuid",
  "tenant_id": "tenant-uuid"
}
```

## QR Code Contextual Tokens

### Generate Contextual Token

```http
POST /identity/v2/contextual-tokens
Content-Type: application/json
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7...
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "event_id": "event-uuid",
  "location": "Building A, Room 101",
  "audience": "attendance-system",
  "expires_in": 300
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "expires_at": "2024-01-15T10:35:00Z"
}
```

### Validate Contextual Token

```http
POST /identity/v2/contextual-tokens/validate
Content-Type: application/json

{
  "token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
  "audience": "attendance-system"
}
```

## Error Responses

### Standard Error Format

```json
{
  "error": "invalid_request",
  "error_description": "The request is missing a required parameter",
  "error_uri": "https://docs.smartedify.com/errors#invalid_request"
}
```

### Common Error Codes

| Error Code | Description |
|------------|-------------|
| `invalid_request` | Malformed or missing required parameters |
| `invalid_client` | Client authentication failed |
| `invalid_grant` | Authorization grant is invalid or expired |
| `unauthorized_client` | Client not authorized for this grant type |
| `unsupported_grant_type` | Grant type not supported |
| `invalid_scope` | Requested scope is invalid |
| `access_denied` | Resource owner denied the request |
| `server_error` | Internal server error |
| `temporarily_unavailable` | Service temporarily unavailable |

### DPoP-Specific Errors

| Error Code | Description |
|------------|-------------|
| `invalid_dpop_proof` | DPoP proof is malformed or invalid |
| `use_dpop_nonce` | DPoP nonce required (with nonce in response) |

## Rate Limiting

All endpoints are subject to rate limiting:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 60

{
  "error": "rate_limit_exceeded",
  "error_description": "Too many requests. Please retry after 60 seconds."
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { IdentityClient } from '@smartedify/identity-sdk';

const client = new IdentityClient({
  baseUrl: 'https://identity.smartedify.com',
  clientId: 'your-client-id',
  tenantId: 'your-tenant-id'
});

// Authorization Code Flow with PKCE
const authUrl = await client.getAuthorizationUrl({
  redirectUri: 'https://your-app.com/callback',
  scope: 'openid profile email',
  state: 'random-state'
});

// Exchange code for tokens
const tokens = await client.exchangeCodeForTokens({
  code: 'authorization-code',
  codeVerifier: 'code-verifier',
  redirectUri: 'https://your-app.com/callback'
});

// Use DPoP-bound tokens
const userInfo = await client.getUserInfo(tokens.accessToken);
```

### Python

```python
from smartedify_identity import IdentityClient

client = IdentityClient(
    base_url='https://identity.smartedify.com',
    client_id='your-client-id',
    tenant_id='your-tenant-id'
)

# WebAuthn registration
registration_options = client.webauthn.get_registration_options(
    username='user@example.com'
)

# Verify registration
result = client.webauthn.verify_registration(
    credential_response=credential_response,
    challenge=registration_options['challenge']
)
```

## Testing

### Test Environment

```
Base URL: https://identity-test.smartedify.com
Test Tenant ID: test-tenant-uuid
Test Client ID: test-client-id
```

### Postman Collection

A comprehensive Postman collection is available with pre-configured requests for all endpoints:

```bash
# Import collection
curl -o smartedify-identity.postman_collection.json \
  https://docs.smartedify.com/postman/identity-service.json
```

### Integration Testing

```javascript
// Jest test example
describe('OAuth Flow Integration', () => {
  it('should complete authorization code flow', async () => {
    // 1. Create PAR request
    const parResponse = await request(app)
      .post('/oauth/par')
      .send({
        code_challenge: 'challenge',
        code_challenge_method: 'S256',
        redirect_uri: 'https://client.example.com/callback',
        scope: 'openid profile'
      });
    
    expect(parResponse.status).toBe(201);
    expect(parResponse.body.request_uri).toBeDefined();
    
    // 2. Authorization request
    const authResponse = await request(app)
      .get('/oauth/authorize')
      .query({
        request_uri: parResponse.body.request_uri,
        client_id: 'test-client'
      });
    
    // 3. Token exchange
    const tokenResponse = await request(app)
      .post('/oauth/token')
      .set('DPoP', dpopProof)
      .send({
        grant_type: 'authorization_code',
        code: 'auth-code',
        code_verifier: 'verifier'
      });
    
    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.access_token).toBeDefined();
  });
});
```

This comprehensive API documentation provides developers with all the information needed to integrate with the SmartEdify Identity Service securely and effectively.