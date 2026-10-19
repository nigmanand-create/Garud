import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  OrderStatus,
  PaymentStatus,
  TransactionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService - Bank Transfer UTR Uniqueness & Concurrency', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  let testBuyerUserId: string;
  let testBuyerOrgId: string;
  let testVendorOrgId: string;
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_mock';
              if (key === 'RAZORPAY_KEY_SECRET') return 'rzp_secret_mock';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Fetch existing buyer and orgs from seeded DB or create test fixtures
    const buyer = await prisma.user.findFirst({
      where: { role: UserRole.BUYER },
      include: { organization: true },
    });
    if (!buyer || !buyer.organization) {
      throw new Error('Test prerequisite: Seeded buyer user/org not found');
    }
    testBuyerUserId = buyer.id;
    testBuyerOrgId = buyer.organization.id;

    const vendorOrg = await prisma.organization.findFirst({
      where: { id: { not: testBuyerOrgId } },
    });
    if (!vendorOrg) {
      throw new Error('Test prerequisite: Vendor org not found');
    }
    testVendorOrgId = vendorOrg.id;
  });

  afterAll(async () => {
    // Clean up all orders and payment transactions created by the tests
    if (createdOrderIds.length > 0) {
      await prisma.paymentTransaction.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }
    await prisma.$disconnect();
  });

  async function createTestOrder(status: OrderStatus = OrderStatus.CONFIRMED) {
    const order = await prisma.order.create({
      data: {
        buyerUserId: testBuyerUserId,
        buyerOrganizationId: testBuyerOrgId,
        vendorOrganizationId: testVendorOrgId,
        status,
        paymentStatus: PaymentStatus.PENDING,
        subtotalInr: 10000,
        taxInr: 1800,
        shippingInr: 500,
        totalInr: 12300,
        companyName: 'Test Buyer Ltd',
        contactName: 'Tester',
        contactPhone: '+91 9999999999',
        shippingAddressLine1: 'Test Address Line 1',
        shippingCity: 'Bengaluru',
        shippingState: 'Karnataka',
        shippingPincode: '560001',
        shippingCountry: 'India',
        billingAddressLine1: 'Test Billing Line 1',
        billingCity: 'Bengaluru',
        billingState: 'Karnataka',
        billingPincode: '560001',
        billingCountry: 'India',
      },
    });
    createdOrderIds.push(order.id);
    return order;
  }

  it('1. accepts a new unique UTR', async () => {
    const order = await createTestOrder();
    const testUtr = `TESTUTR${Date.now()}A`;

    const result = await service.submitBankTransfer(
      testBuyerUserId,
      UserRole.BUYER,
      {
        orderId: order.id,
        utrNumber: testUtr,
        senderBankName: 'State Bank of India',
        notes: 'Initial test payment',
      },
    );

    expect(result.success).toBe(true);
    expect(result.transaction.utrNumber).toBe(testUtr);
    expect(result.transaction.status).toBe(TransactionStatus.PROCESSING);
    expect(result.transaction.orderId).toBe(order.id);
  });

  it('2. rejects reusing the same UTR on the same order', async () => {
    const order = await createTestOrder();
    const testUtr = `TESTUTR${Date.now()}B`;

    // First submission succeeds
    await service.submitBankTransfer(testBuyerUserId, UserRole.BUYER, {
      orderId: order.id,
      utrNumber: testUtr,
    });

    // Second submission on the same order with the same UTR must fail with ConflictException
    await expect(
      service.submitBankTransfer(testBuyerUserId, UserRole.BUYER, {
        orderId: order.id,
        utrNumber: testUtr,
      }),
    ).rejects.toThrow(ConflictException);

    await expect(
      service.submitBankTransfer(testBuyerUserId, UserRole.BUYER, {
        orderId: order.id,
        utrNumber: testUtr,
      }),
    ).rejects.toThrow(
      'This bank transfer reference (UTR) has already been submitted or processed.',
    );
  });

  it('3. rejects reusing the same UTR on a different order (cross-order uniqueness)', async () => {
    const order1 = await createTestOrder();
    const order2 = await createTestOrder();
    const testUtr = `TESTUTR${Date.now()}C`;

    // Submit to order 1
    const res1 = await service.submitBankTransfer(
      testBuyerUserId,
      UserRole.BUYER,
      {
        orderId: order1.id,
        utrNumber: testUtr,
      },
    );
    expect(res1.success).toBe(true);

    // Attempt to reuse same UTR on order 2 must fail with ConflictException
    await expect(
      service.submitBankTransfer(testBuyerUserId, UserRole.BUYER, {
        orderId: order2.id,
        utrNumber: testUtr,
      }),
    ).rejects.toThrow(ConflictException);

    // Must return generic message without leaking other order details
    await expect(
      service.submitBankTransfer(testBuyerUserId, UserRole.BUYER, {
        orderId: order2.id,
        utrNumber: testUtr,
      }),
    ).rejects.toThrow(
      'This bank transfer reference (UTR) has already been submitted or processed.',
    );
  });

  it('4. handles equivalent normalized inputs consistently (case and whitespace)', async () => {
    const order1 = await createTestOrder();
    const order2 = await createTestOrder();
    const baseUtr = `normutr${Date.now()}`;

    // Submit with lowercase and leading/trailing whitespace
    const res = await service.submitBankTransfer(
      testBuyerUserId,
      UserRole.BUYER,
      {
        orderId: order1.id,
        utrNumber: `  ${baseUtr.toLowerCase()}  `,
      },
    );
    expect(res.success).toBe(true);
    expect(res.transaction.utrNumber).toBe(baseUtr.toUpperCase());

    // Attempt to reuse same UTR in uppercase on another order
    await expect(
      service.submitBankTransfer(testBuyerUserId, UserRole.BUYER, {
        orderId: order2.id,
        utrNumber: baseUtr.toUpperCase(),
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('5. concurrent duplicate submissions cannot both succeed (advisory lock race safety)', async () => {
    const order1 = await createTestOrder();
    const order2 = await createTestOrder();
    const testUtr = `CONCUR${Date.now()}X`;

    // Fire two simultaneous requests with the exact same UTR
    const [result1, result2] = await Promise.allSettled([
      service.submitBankTransfer(testBuyerUserId, UserRole.BUYER, {
        orderId: order1.id,
        utrNumber: testUtr,
      }),
      service.submitBankTransfer(testBuyerUserId, UserRole.BUYER, {
        orderId: order2.id,
        utrNumber: testUtr,
      }),
    ]);

    const fulfilled = [result1, result2].filter(
      (r) => r.status === 'fulfilled',
    );
    const rejected = [result1, result2].filter((r) => r.status === 'rejected');

    // Exactly one must succeed and one must be rejected
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    if (rejected[0].status === 'rejected') {
      expect(rejected[0].reason).toBeInstanceOf(ConflictException);
      expect((rejected[0].reason as ConflictException).message).toBe(
        'This bank transfer reference (UTR) has already been submitted or processed.',
      );
    }
  });

  it('6. unrelated valid payment submissions continue to work concurrently', async () => {
    const order1 = await createTestOrder();
    const order2 = await createTestOrder();
    const utr1 = `VALID${Date.now()}1`;
    const utr2 = `VALID${Date.now()}2`;

    const [res1, res2] = await Promise.all([
      service.submitBankTransfer(testBuyerUserId, UserRole.BUYER, {
        orderId: order1.id,
        utrNumber: utr1,
      }),
      service.submitBankTransfer(testBuyerUserId, UserRole.BUYER, {
        orderId: order2.id,
        utrNumber: utr2,
      }),
    ]);

    expect(res1.success).toBe(true);
    expect(res1.transaction.utrNumber).toBe(utr1);
    expect(res2.success).toBe(true);
    expect(res2.transaction.utrNumber).toBe(utr2);
  });

  it('7. preserves order access control and validation', async () => {
    const order = await createTestOrder();
    const otherUserId = '00000000-0000-0000-0000-000000000000';

    // Different buyer user attempting to submit for this order
    await expect(
      service.submitBankTransfer(otherUserId, UserRole.BUYER, {
        orderId: order.id,
        utrNumber: `UNAUTH${Date.now()}`,
      }),
    ).rejects.toThrow(ForbiddenException);

    // Cancelled order cannot accept UTR
    const cancelledOrder = await createTestOrder(OrderStatus.CANCELLED);
    await expect(
      service.submitBankTransfer(testBuyerUserId, UserRole.BUYER, {
        orderId: cancelledOrder.id,
        utrNumber: `CANCELLED${Date.now()}`,
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    // Non-existent order
    await expect(
      service.submitBankTransfer(testBuyerUserId, UserRole.BUYER, {
        orderId: '00000000-0000-0000-0000-000000000000',
        utrNumber: `NONEXIST${Date.now()}`,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
