# Identity Service

This is the Identity Service for the SmartEdify-A application. It is a NestJS-based microservice responsible for managing user identities, authentication, and authorization, following modern security standards like OAuth 2.1 and FIDO2/WebAuthn.

## Features

- **Secure Authentication Flows:**
  - OAuth 2.1 compliant Authorization Code Flow with PKCE.
  - DPoP (Distributed Proof of Possession) for sender-constrained tokens.
  - Pushed Authorization Requests (PAR) for enhanced security.
  - Device Authorization Flow for input-constrained devices.
  - Passkey/WebAuthn registration and authentication (options generation).
- **Robust Key Management:**
  - Automated daily key rotation for signing keys.
  - Tenant-aware JWKS endpoint (`/.well-known/jwks.json`) for dynamic key discovery.
- **Security & Observability:**
  - DPoP proof anti-replay protection.
  - Basic tenant isolation for security keys.
  - Prometheus metrics exposed at the `/metrics` endpoint.

## Getting Started

### Prerequisites

- Node.js
- npm
- A running PostgreSQL database

### Installation

1. Clone the repository.
2. Navigate to the `identity-service` directory.
3. Install dependencies:
   ```bash
   $ npm install
   ```

### Running the Application

Create a `.env` file in the root of the service directory with your database configuration. Then, run one of the following commands:

```bash
# Development mode
$ npm run start

# Watch mode (reloads on file changes)
$ npm run start:dev
```

### Running Tests

The service includes a comprehensive suite of unit and end-to-end tests.

```bash
# Run all unit tests
$ npm run test

# Run all end-to-end tests
# Note: Requires a running test database configured via environment variables.
$ npm run test:e2e

# Run unit tests with coverage report
$ npm run test:cov
```

## API Endpoints

| Endpoint                                | Method | Description                                                                 |
| --------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `/oauth/par`                            | `POST` | **Pushed Authorization Request:** Initiates an authorization flow securely.     |
| `/oauth/device_authorization`           | `POST` | **Device Authorization:** Starts the flow for input-constrained devices.      |
| `/oauth/authorize`                      | `GET`    | Standard authorization endpoint. Processes direct requests or a `request_uri` from PAR. |
| `/oauth/token`                          | `POST`   | Exchanges an authorization code or device code for tokens. Requires DPoP.   |
| `/oauth/revoke`                         | `POST`   | **Token Revocation:** Invalidates a refresh token.                          |
| `/oauth/introspect`                     | `POST`   | **Token Introspection:** Checks the validity of a token (client-protected). |
| `/.well-known/jwks.json`                | `GET`    | Exposes public keys for token signature verification, per tenant.           |
| `/.well-known/openid-configuration`     | `GET`  | Exposes OIDC discovery information.                                         |
| `/users`                                | `POST` | **Create User:** Creates a new user.                                        |
| `/webauthn/registration/options`        | `GET`    | Generates options for registering a new Passkey/WebAuthn credential.        |
| `/webauthn/registration/verification`   | `POST` | Verifies the registration of a new Passkey/WebAuthn credential.             |
| `/webauthn/authentication/options`      | `GET`    | Generates options for authenticating with a Passkey/WebAuthn credential.    |
| `/webauthn/authentication/verification` | `POST` | Verifies the authentication of a Passkey/WebAuthn credential.               |

