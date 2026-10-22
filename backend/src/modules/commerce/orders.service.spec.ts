import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountType,
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  TransactionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AdminService } from '../admin/admin.service';
import { PaymentsService } from '../payments/payments.service';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import { OrdersService } from './orders.service';

describe('Orders & Fulfillment Workflow Integration (TASK-004)', () => {
  let ordersService: OrdersService;
  let adminService: AdminService;
  let paymentsService: PaymentsService;
  let prisma: PrismaService;

  let buyerUserId: string;
  let buyerOrgId: string;
  let otherBuyerUserId: string;

  let partnerUserId: string;
  let partnerOrgId: string;
  let otherPartnerUserId: string;

  let adminUserId: string;

  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        CheckoutService,
        CartService,
        AdminService,
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

    ordersService = module.get<OrdersService>(OrdersService);
    adminService = module.get<AdminService>(AdminService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);

    // 1. Fetch Primary Buyer
    const buyer = await prisma.user.findFirst({
      where: { role: UserRole.BUYER },
      include: { organization: true },
    });
    if (!buyer || !buyer.organization) {
      throw new Error('Test prerequisite: Seeded buyer user/org not found');
    }
    buyerUserId = buyer.id;
    buyerOrgId = buyer.organization.id;

    // 2. Fetch or create a second buyer for authorization testing
    let otherBuyer = await prisma.user.findFirst({
      where: { role: UserRole.BUYER, id: { not: buyerUserId } },
    });
    if (!otherBuyer) {
      otherBuyer = await prisma.user.create({
        data: {
          email: `other-buyer-${Date.now()}@garudhub.test`,
          passwordHash: '$2b$10$mockhashforunittestingonly',
          role: UserRole.BUYER,
          accountType: AccountType.BUYER_ENTERPRISE,
        },
      });
    }
    otherBuyerUserId = otherBuyer.id;

    // 3. Fetch Primary Partner
    const partner = await prisma.user.findFirst({
      where: { role: UserRole.PARTNER },
      include: { organization: true },
    });
    if (!partner || !partner.organization) {
      throw new Error('Test prerequisite: Seeded partner user/org not found');
    }
    partnerUserId = partner.id;
    partnerOrgId = partner.organization.id;

    // 4. Fetch or create a second partner for cross-tenant isolation testing
    let otherPartner = await prisma.user.findFirst({
      where: { role: UserRole.PARTNER, id: { not: partnerUserId } },
      include: { organization: true },
    });
    if (!otherPartner || !otherPartner.organization) {
      const createdUser = await prisma.user.create({
        data: {
          email: `other-partner-${Date.now()}@garudhub.test`,
          passwordHash: '$2b$10$mockhashforunittestingonly',
          role: UserRole.PARTNER,
          accountType: AccountType.MANUFACTURER,
          organization: {
            create: {
              companyName: 'Other Aerospace Partner Ltd',
              country: 'India',
              contactPersonName: 'Other Vendor',
              contactEmail: `vendor-${Date.now()}@garudhub.test`,
              contactMobile: '+91 91234 56789',
            },
          },
        },
        include: { organization: true },
      });
      otherPartner = createdUser;
    }
    otherPartnerUserId = otherPartner.id;

    // 5. Fetch Admin
    const admin = await prisma.user.findFirst({
      where: { role: UserRole.PLATFORM_ADMIN },
    });
    if (!admin) {
      throw new Error('Test prerequisite: Seeded admin user not found');
    }
    adminUserId = admin.id;
  });

  afterAll(async () => {
    if (createdOrderIds.length > 0) {
      await prisma.paymentTransaction.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.orderLineItem.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }
    await prisma.$disconnect();
  });

  async function createTestOrder(
    overrides: {
      status?: OrderStatus;
      fulfillmentStatus?: FulfillmentStatus;
      paymentStatus?: PaymentStatus;
      vendorOrgId?: string;
    } = {},
  ) {
    const order = await prisma.order.create({
      data: {
        buyerUserId,
        buyerOrganizationId: buyerOrgId,
        vendorOrganizationId: overrides.vendorOrgId || partnerOrgId,
        status: overrides.status ?? OrderStatus.CONFIRMED,
        fulfillmentStatus:
          overrides.fulfillmentStatus ?? FulfillmentStatus.PENDING,
        paymentStatus: overrides.paymentStatus ?? PaymentStatus.PENDING,
        subtotalInr: 25000,
        taxInr: 4500,
        shippingInr: 500,
        totalInr: 30000,
        companyName: 'Buyer Test Enterprise',
        contactName: 'Procurement Officer',
        contactPhone: '+91 9888888888',
        shippingAddressLine1: 'Hangar 4, Tech Aerospace Park',
        shippingCity: 'Bengaluru',
        shippingState: 'Karnataka',
        shippingPincode: '560066',
        shippingCountry: 'India',
        billingAddressLine1: 'Hangar 4, Tech Aerospace Park',
        billingCity: 'Bengaluru',
        billingState: 'Karnataka',
        billingPincode: '560066',
        billingCountry: 'India',
      },
      include: {
        vendorOrganization: { select: { id: true, companyName: true } },
        lineItems: true,
        transactions: true,
      },
    });
    createdOrderIds.push(order.id);
    return order;
  }

  describe('1. Fulfillment Transitions', () => {
    it('allows a partner to progress fulfillment through standard stages (PENDING -> PROCESSING -> SHIPPED -> FULFILLED)', async () => {
      const order = await createTestOrder();
      expect(order.fulfillmentStatus).toBe(FulfillmentStatus.PENDING);

      // PENDING -> PROCESSING
      const step1 = await ordersService.updatePartnerOrderFulfillment(
        partnerUserId,
        order.id,
        FulfillmentStatus.PROCESSING,
      );
      expect(step1.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);

      // PROCESSING -> SHIPPED
      const step2 = await ordersService.updatePartnerOrderFulfillment(
        partnerUserId,
        order.id,
        FulfillmentStatus.SHIPPED,
      );
      expect(step2.fulfillmentStatus).toBe(FulfillmentStatus.SHIPPED);

      // SHIPPED -> FULFILLED
      const step3 = await ordersService.updatePartnerOrderFulfillment(
        partnerUserId,
        order.id,
        FulfillmentStatus.FULFILLED,
      );
      expect(step3.fulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
    });

    it('updates fulfillment with carrier, tracking number, serial numbers and auto-records timestamps', async () => {
      const order = await createTestOrder();
      const updated = await ordersService.updatePartnerOrderFulfillment(
        partnerUserId,
        order.id,
        {
          fulfillmentStatus: FulfillmentStatus.SHIPPED,
          carrierName: 'Delhivery Surface',
          trackingNumber: 'DEL1234567890',
          trackingUrl: 'https://delhivery.com/track/DEL1234567890',
          hardwareSerialNumbers: ['SN-DRONE-883', 'SN-BAT-001'],
          fulfillmentNotes: 'Dispatched via insured express shipment',
          estimatedDeliveryAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        },
      );

      expect(updated.fulfillmentStatus).toBe(FulfillmentStatus.SHIPPED);
      expect(updated.carrierName).toBe('Delhivery Surface');
      expect(updated.trackingNumber).toBe('DEL1234567890');
      expect(updated.trackingUrl).toBe('https://delhivery.com/track/DEL1234567890');
      expect(updated.hardwareSerialNumbers).toEqual(['SN-DRONE-883', 'SN-BAT-001']);
      expect(updated.fulfillmentNotes).toBe('Dispatched via insured express shipment');
      expect(updated.dispatchedAt).toBeDefined();
      expect(typeof updated.dispatchedAt).toBe('string');
    });

    it('rejects fulfillment status updates on a CANCELLED order', async () => {
      const order = await createTestOrder({ status: OrderStatus.CANCELLED });

      await expect(
        ordersService.updatePartnerOrderFulfillment(
          partnerUserId,
          order.id,
          FulfillmentStatus.PROCESSING,
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects fulfillment updates from a partner who does not own the vendor organization', async () => {
      const order = await createTestOrder();

      await expect(
        ordersService.updatePartnerOrderFulfillment(
          otherPartnerUserId,
          order.id,
          FulfillmentStatus.PROCESSING,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Buyer Access & Payment Submission Restrictions', () => {
    it('allows the order owner to view order details but rejects other buyers', async () => {
      const order = await createTestOrder();

      const buyerOrder = await ordersService.getBuyerOrder(
        buyerUserId,
        order.id,
      );
      expect(buyerOrder.id).toBe(order.id);

      await expect(
        ordersService.getBuyerOrder(otherBuyerUserId, order.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects bank transfer submission if order is CANCELLED', async () => {
      const order = await createTestOrder({ status: OrderStatus.CANCELLED });

      await expect(
        paymentsService.submitBankTransfer(buyerUserId, UserRole.BUYER, {
          orderId: order.id,
          utrNumber: `UTR-CANCELLED-${Date.now()}`,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects bank transfer submission if order is already PAID', async () => {
      const order = await createTestOrder({
        paymentStatus: PaymentStatus.PAID,
      });

      await expect(
        paymentsService.submitBankTransfer(buyerUserId, UserRole.BUYER, {
          orderId: order.id,
          utrNumber: `UTR-ALREADY-PAID-${Date.now()}`,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects bank transfer submission by an unauthorized user', async () => {
      const order = await createTestOrder();

      await expect(
        paymentsService.submitBankTransfer(otherBuyerUserId, UserRole.BUYER, {
          orderId: order.id,
          utrNumber: `UTR-UNAUTH-${Date.now()}`,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Payment Reconciliation Workflow (Admin Approval & Rejection)', () => {
    it('approving a bank transfer sets transaction to SUCCESS and order paymentStatus to PAID', async () => {
      const order = await createTestOrder();
      const utr = `UTR-APPROVE-${Date.now()}`;

      // Buyer submits transfer
      const submitRes = await paymentsService.submitBankTransfer(
        buyerUserId,
        UserRole.BUYER,
        {
          orderId: order.id,
          utrNumber: utr,
          senderBankName: 'HDFC Bank Ltd',
        },
      );
      expect(submitRes.transaction.status).toBe(TransactionStatus.PROCESSING);

      // Admin approves
      const verifyRes = await paymentsService.adminVerifyBankTransfer(
        adminUserId,
        {
          transactionId: submitRes.transaction.id,
          action: 'APPROVE',
        },
      );

      expect(verifyRes.success).toBe(true);
      expect(verifyRes.transactionStatus).toBe(TransactionStatus.SUCCESS);
      expect(verifyRes.orderPaymentStatus).toBe(PaymentStatus.PAID);

      // Verify DB state
      const dbOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(dbOrder?.paymentStatus).toBe(PaymentStatus.PAID);
      expect(dbOrder?.status).toBe(OrderStatus.CONFIRMED);

      const dbTx = await prisma.paymentTransaction.findUnique({
        where: { id: submitRes.transaction.id },
      });
      expect(dbTx?.status).toBe(TransactionStatus.SUCCESS);
      const metaApprove = dbTx?.metadata as Record<string, unknown> | null;
      expect(metaApprove?.verifiedByAdminUserId).toBe(adminUserId);
    });

    it('rejecting a bank transfer sets transaction to FAILED and keeps order paymentStatus PENDING', async () => {
      const order = await createTestOrder();
      const utr = `UTR-REJECT-${Date.now()}`;

      // Buyer submits transfer
      const submitRes = await paymentsService.submitBankTransfer(
        buyerUserId,
        UserRole.BUYER,
        {
          orderId: order.id,
          utrNumber: utr,
        },
      );

      // Admin rejects
      const rejectionReason = 'Bank reference not found in statement';
      const verifyRes = await paymentsService.adminVerifyBankTransfer(
        adminUserId,
        {
          transactionId: submitRes.transaction.id,
          action: 'REJECT',
          rejectionReason,
        },
      );

      expect(verifyRes.success).toBe(true);
      expect(verifyRes.transactionStatus).toBe(TransactionStatus.FAILED);
      expect(verifyRes.orderPaymentStatus).toBe(PaymentStatus.PENDING);

      // Verify DB state
      const dbTx = await prisma.paymentTransaction.findUnique({
        where: { id: submitRes.transaction.id },
      });
      expect(dbTx?.status).toBe(TransactionStatus.FAILED);
      expect(dbTx?.failureReason).toBe(rejectionReason);
      const metaReject = dbTx?.metadata as Record<string, unknown> | null;
      expect(metaReject?.rejectedByAdminUserId).toBe(adminUserId);
    });

    it('rejects repeated verification on an already settled (SUCCESS) transaction', async () => {
      const order = await createTestOrder();
      const utr = `UTR-SETTLED-${Date.now()}`;

      const submitRes = await paymentsService.submitBankTransfer(
        buyerUserId,
        UserRole.BUYER,
        {
          orderId: order.id,
          utrNumber: utr,
        },
      );

      await paymentsService.adminVerifyBankTransfer(adminUserId, {
        transactionId: submitRes.transaction.id,
        action: 'APPROVE',
      });

      // Second approval attempt must be rejected
      await expect(
        paymentsService.adminVerifyBankTransfer(adminUserId, {
          transactionId: submitRes.transaction.id,
          action: 'APPROVE',
        }),
      ).rejects.toThrow(BadRequestException);

      // Attempting to reject an already approved transaction must also be rejected
      await expect(
        paymentsService.adminVerifyBankTransfer(adminUserId, {
          transactionId: submitRes.transaction.id,
          action: 'REJECT',
          rejectionReason: 'Late change of mind',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects verifying payment for a CANCELLED order', async () => {
      const order = await createTestOrder();
      const utr = `UTR-ORD-CANCEL-${Date.now()}`;

      const submitRes = await paymentsService.submitBankTransfer(
        buyerUserId,
        UserRole.BUYER,
        {
          orderId: order.id,
          utrNumber: utr,
        },
      );

      // Cancel the order before verification
      await adminService.cancelOrder(
        order.id,
        adminUserId,
        'Buyer requested cancellation',
      );

      // Attempt to verify payment on cancelled order
      await expect(
        paymentsService.adminVerifyBankTransfer(adminUserId, {
          transactionId: submitRes.transaction.id,
          action: 'APPROVE',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('4. Order Cancellation & State Consistency', () => {
    it('admin cancels order and sets status to CANCELLED', async () => {
      const order = await createTestOrder();

      const cancelled = await adminService.cancelOrder(
        order.id,
        adminUserId,
        'Mutual contract dissolution',
      );
      expect(cancelled.status).toBe(OrderStatus.CANCELLED);

      const dbOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(dbOrder?.status).toBe(OrderStatus.CANCELLED);
    });

    it('rejects duplicate cancellation attempt on an already CANCELLED order', async () => {
      const order = await createTestOrder();

      await adminService.cancelOrder(
        order.id,
        adminUserId,
        'First cancellation',
      );

      await expect(
        adminService.cancelOrder(order.id, adminUserId, 'Second cancellation'),
      ).rejects.toThrow(BadRequestException);
    });

    it('cancellation after payment preserves paymentStatus as PAID unless explicitly refunded', async () => {
      const order = await createTestOrder({
        paymentStatus: PaymentStatus.PAID,
      });

      const cancelled = await adminService.cancelOrder(
        order.id,
        adminUserId,
        'Cancelled post-payment for store credit',
      );

      expect(cancelled.status).toBe(OrderStatus.CANCELLED);
      expect(cancelled.paymentStatus).toBe(PaymentStatus.PAID);

      // Admin manual override to REFUNDED
      const updatedPayment = await adminService.updateOrderPayment(
        order.id,
        adminUserId,
        PaymentStatus.REFUNDED,
      );

      expect(updatedPayment.status).toBe(OrderStatus.CANCELLED);
      expect(updatedPayment.paymentStatus).toBe(PaymentStatus.REFUNDED);
    });
  });

  describe('5. Audit and Notification System Assessment', () => {
    it('verifies that no external notification provider is bound (documents missing provider)', () => {
      // In accordance with TASK-004 constraints: confirm no notification service was injected
      const ordersRecord = ordersService as unknown as Record<string, unknown>;
      const paymentsRecord = paymentsService as unknown as Record<
        string,
        unknown
      >;
      expect(ordersRecord.notificationService).toBeUndefined();
      expect(paymentsRecord.notificationService).toBeUndefined();
    });
  });
});
