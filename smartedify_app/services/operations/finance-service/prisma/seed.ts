import { PrismaClient, OrderType, OrderStatus, PaymentProvider } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Finance Service database...');

  // Create sample orders
  const sampleOrders = [
    {
      id: 'order_1',
      tenantId: 'tenant_1',
      type: OrderType.RESERVATION_FEE,
      status: OrderStatus.PENDING,
      amount: 50.00,
      currency: 'PEN',
      description: 'Pool reservation fee',
      referenceId: 'reservation_1',
      referenceType: 'reservation',
      customerId: 'user_1',
      customerEmail: 'user1@example.com',
      customerName: 'John Doe',
      metadata: {
        amenityType: 'pool',
        duration: 2,
      },
    },
    {
      id: 'order_2',
      tenantId: 'tenant_1',
      type: OrderType.MAINTENANCE_FEE,
      status: OrderStatus.CONFIRMED,
      amount: 150.00,
      currency: 'PEN',
      description: 'Monthly maintenance fee',
      referenceId: 'maintenance_2024_01',
      referenceType: 'maintenance',
      customerId: 'user_2',
      customerEmail: 'user2@example.com',
      customerName: 'Jane Smith',
      metadata: {
        period: '2024-01',
        apartmentNumber: '101',
      },
    },
    {
      id: 'order_3',
      tenantId: 'tenant_2',
      type: OrderType.PENALTY_FEE,
      status: OrderStatus.PENDING,
      amount: 25.00,
      currency: 'PEN',
      description: 'Late payment penalty',
      referenceId: 'penalty_001',
      referenceType: 'penalty',
      customerId: 'user_3',
      customerEmail: 'user3@example.com',
      customerName: 'Bob Johnson',
      metadata: {
        originalOrderId: 'order_2',
        daysLate: 15,
      },
    },
  ];

  for (const orderData of sampleOrders) {
    await prisma.order.upsert({
      where: { id: orderData.id },
      update: {},
      create: orderData,
    });
  }

  // Create sample payments
  const samplePayments = [
    {
      id: 'payment_1',
      orderId: 'order_2',
      status: 'COMPLETED' as const,
      amount: 150.00,
      currency: 'PEN',
      provider: PaymentProvider.STRIPE,
      providerPaymentId: 'pi_stripe_123456',
      paymentMethod: 'card',
      transactionId: 'txn_123456',
      processedAt: new Date(),
      metadata: {
        cardLast4: '4242',
        cardBrand: 'visa',
      },
    },
  ];

  for (const paymentData of samplePayments) {
    await prisma.payment.upsert({
      where: { id: paymentData.id },
      update: {},
      create: paymentData,
    });
  }

  // Create sample payment methods
  const samplePaymentMethods = [
    {
      id: 'pm_1',
      customerId: 'user_1',
      tenantId: 'tenant_1',
      type: 'CARD' as const,
      provider: PaymentProvider.STRIPE,
      providerId: 'pm_stripe_123',
      cardLast4: '4242',
      cardBrand: 'visa',
      cardExpMonth: 12,
      cardExpYear: 2025,
      isDefault: true,
      metadata: {
        fingerprint: 'fp_123456',
      },
    },
    {
      id: 'pm_2',
      customerId: 'user_2',
      tenantId: 'tenant_1',
      type: 'CARD' as const,
      provider: PaymentProvider.CULQI,
      providerId: 'pm_culqi_456',
      cardLast4: '1234',
      cardBrand: 'mastercard',
      cardExpMonth: 6,
      cardExpYear: 2026,
      isDefault: true,
      metadata: {
        bin: '123456',
      },
    },
  ];

  for (const pmData of samplePaymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { id: pmData.id },
      update: {},
      create: pmData,
    });
  }

  console.log('✅ Finance Service database seeded successfully!');
  console.log(`Created ${sampleOrders.length} orders`);
  console.log(`Created ${samplePayments.length} payments`);
  console.log(`Created ${samplePaymentMethods.length} payment methods`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });