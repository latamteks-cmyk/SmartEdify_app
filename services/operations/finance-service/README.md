# SmartEdify Finance Service

Payment processing and financial operations service for the SmartEdify platform. Handles orders, payments, and integrations with multiple payment providers.

## Features

- **Multi-Provider Support**: Stripe, Culqi (Peru), MercadoPago (Latin America)
- **Order Management**: Create, track, and manage financial orders
- **Payment Processing**: Secure payment handling with webhook support
- **Refund Management**: Full and partial refund capabilities
- **Audit Trail**: Complete transaction history and compliance tracking
- **Multi-Currency**: Support for PEN, USD, ARS, and other currencies

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Orders API    │    │   Payments API   │    │  Webhooks API   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │  Finance Service    │
                    │   (NestJS + Prisma) │
                    └─────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │    PostgreSQL       │
                    │   (Orders, Payments)│
                    └─────────────────────┘
```

## Payment Providers

### Stripe (International)
- Credit/Debit cards
- Payment intents with 3D Secure
- Webhooks for real-time updates

### Culqi (Peru)
- Local Peruvian cards
- Bank transfers
- Mobile payments

### MercadoPago (Latin America)
- Regional payment methods
- Installment payments
- Digital wallets

## API Endpoints

### Orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - List orders
- `GET /api/v1/orders/:id` - Get order details
- `PATCH /api/v1/orders/:id/confirm` - Confirm order
- `PATCH /api/v1/orders/:id/cancel` - Cancel order

### Payments
- `POST /api/v1/payments` - Create payment
- `GET /api/v1/payments` - List payments
- `GET /api/v1/payments/:id` - Get payment details
- `PATCH /api/v1/payments/:id/confirm` - Confirm payment
- `PATCH /api/v1/payments/:id/refund` - Refund payment

### Webhooks
- `POST /api/v1/payments/webhooks/stripe` - Stripe webhooks
- `POST /api/v1/payments/webhooks/culqi` - Culqi webhooks
- `POST /api/v1/payments/webhooks/mercadopago` - MercadoPago webhooks

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup database**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   npm run db:seed
   ```

4. **Start development server**:
   ```bash
   npm run start:dev
   ```

5. **Access API documentation**:
   - Swagger UI: http://localhost:3007/api/docs
   - Health check: http://localhost:3007/health

## Environment Variables

```env
# Server
PORT=3007
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/smartedify_finance"

# JWT
JWT_SECRET=your-jwt-secret

# Payment Providers
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CULQI_SECRET_KEY=sk_test_...
MERCADOPAGO_ACCESS_TOKEN=TEST-...
```

## Responsabilidades Clave (Core Responsibilities)
- Cálculo de cuotas y procesamiento de pagos
- Proporciona el dato de "propietarios habilitados" al governance-service para el cálculo de quórum
- El snapshot de alícuotas se toma y congela al momento de emitir la convocatoria formal
- Gestión financiera: cuotas de mantenimiento, conciliación bancaria, reportes contables (PCGE, NIIF), impuestos

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Deployment

### Docker
```bash
docker build -t smartedify/finance-service .
docker run -p 3007:3007 smartedify/finance-service
```

Consulta las políticas globales en [doc/POLICY_INDEX.md](../../../doc/POLICY_INDEX.md).