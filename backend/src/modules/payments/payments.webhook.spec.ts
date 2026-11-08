import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  PaymentGateway,
  PaymentStatus,
  TransactionStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { hmacSha256Hex } from '../../shared/razorpay/razorpay.util';
import { PartnerBillingService } from '../partner-billing/partner-billing.service';
import { PaymentsService } from './payments.service';

const dec = (n: number) => ({ toNumber: () => n });

describe('PaymentsService webhook + verify hardening (mocked)', () => {
  let service: PaymentsService;
  const env: Record<string, string | undefined> = {};
  let razorpayFindFirstResult: unknown = null;
  let razorpayFindUniqueResult: unknown = null;

  const prisma = {
    order: { findUnique: jest.fn(), update: jest.fn() },
    paymentTransaction: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const billing = { handleSubscriptionEvent: jest.fn() };

  async function build() {
    const mod = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PartnerBillingService, useValue: billing },
        { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
      ],
    }).compile();
    service = mod.get(PaymentsService);
  }

  const sign = (body: string) => hmacSha256Hex(body, 'whsec');
  const captured = (amount = 150000) =>
    JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_1', order_id: 'order_rzp1', amount } },
      },
    });

  beforeEach(async () => {
    jest.resetAllMocks();
    for (const k of Object.keys(env)) delete env[k];
    delete process.env.GARUD_DEPLOY_ENV;
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prisma),
    );
    razorpayFindFirstResult = null;
    razorpayFindUniqueResult = null;
    prisma.paymentTransaction.findFirst.mockImplementation(
      (args: { where?: { gateway?: PaymentGateway } }) => {
        if (args?.where?.gateway === PaymentGateway.CASH_ON_DELIVERY) {
          return Promise.resolve(null);
        }
        return Promise.resolve(razorpayFindFirstResult);
      },
    );
    prisma.paymentTransaction.findUnique.mockImplementation(() =>
      Promise.resolve(razorpayFindUniqueResult),
    );
    env.RAZORPAY_KEY_ID = 'rzp_test_x';
    env.RAZORPAY_KEY_SECRET = 'secret';
    env.RAZORPAY_WEBHOOK_SECRET = 'whsec';
    await build();
  });

  afterAll(() => {
    delete process.env.GARUD_DEPLOY_ENV;
  });

  describe('webhook signature', () => {
    it('rejects a missing signature when a secret is configured', async () => {
      await expect(
        service.handleRazorpayWebhook(captured(), undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.paymentTransaction.findFirst).not.toHaveBeenCalled();
    });

    it('rejects a wrong signature', async () => {
      await expect(
        service.handleRazorpayWebhook(captured(), 'deadbeef'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses unsigned webhooks in production when no secret is set', async () => {
      delete env.RAZORPAY_WEBHOOK_SECRET;
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        await expect(
          service.handleRazorpayWebhook(captured(), undefined),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
      } finally {
        process.env.NODE_ENV = prev;
      }
    });
  });

  describe('payment.captured', () => {
    it('marks the order PAID for a valid, amount-matching event', async () => {
      razorpayFindFirstResult = {
        id: 'tx1',
        orderId: 'o1',
        gateway: PaymentGateway.RAZORPAY,
        status: TransactionStatus.CREATED,
        amountInr: dec(1500),
        paymentMethod: null,
      };
      razorpayFindUniqueResult = razorpayFindFirstResult;
      const body = captured();
      const res = await service.handleRazorpayWebhook(body, sign(body));
      expect(res.handled).toBe(true);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { paymentStatus: PaymentStatus.PAID },
      });
    });

    it('handles order.paid when only the order entity is present', async () => {
      razorpayFindFirstResult = {
        id: 'tx1',
        orderId: 'o1',
        gateway: PaymentGateway.RAZORPAY,
        status: TransactionStatus.CREATED,
        amountInr: dec(1500),
        paymentMethod: null,
      };
      razorpayFindUniqueResult = razorpayFindFirstResult;
      const body = JSON.stringify({
        event: 'order.paid',
        payload: {
          order: { entity: { id: 'order_rzp1', amount: 150000 } },
        },
      });
      const res = await service.handleRazorpayWebhook(body, sign(body));
      expect(res.handled).toBe(true);
    });

    it('is idempotent on replay', async () => {
      razorpayFindFirstResult = {
        id: 'tx1',
        orderId: 'o1',
        gateway: PaymentGateway.RAZORPAY,
        status: TransactionStatus.SUCCESS,
        amountInr: dec(1500),
      };
      const body = captured();
      const res = await service.handleRazorpayWebhook(body, sign(body));
      expect(res.handled).toBe(false);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('does not mark paid when the amount differs', async () => {
      razorpayFindFirstResult = {
        id: 'tx1',
        orderId: 'o1',
        gateway: PaymentGateway.RAZORPAY,
        status: TransactionStatus.CREATED,
        amountInr: dec(1500),
      };
      razorpayFindUniqueResult = razorpayFindFirstResult;
      const body = captured(100);
      const res = await service.handleRazorpayWebhook(body, sign(body));
      expect(res.handled).toBe(false);
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(prisma.paymentTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failureReason: expect.stringContaining('mismatch'),
          }),
        }),
      );
    });
  });

  it('marks the transaction FAILED on payment.failed without touching the order', async () => {
    razorpayFindFirstResult = {
      id: 'tx1',
      orderId: 'o1',
      gateway: PaymentGateway.RAZORPAY,
      status: TransactionStatus.CREATED,
    };
    const body = JSON.stringify({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_9',
            order_id: 'order_rzp1',
            amount: 1,
            error_description: 'Card declined',
          },
        },
      },
    });
    await service.handleRazorpayWebhook(body, sign(body));
    expect(prisma.paymentTransaction.update).toHaveBeenCalledWith({
      where: { id: 'tx1' },
      data: expect.objectContaining({
        status: TransactionStatus.FAILED,
        failureReason: 'Card declined',
      }),
    });
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('marks order REFUNDED on a full refund.processed', async () => {
    razorpayFindFirstResult = {
      id: 'tx1',
      orderId: 'o1',
      status: TransactionStatus.SUCCESS,
      amountInr: dec(1500),
    };
    const body = JSON.stringify({
      event: 'refund.processed',
      payload: { refund: { entity: { payment_id: 'pay_1', amount: 150000 } } },
    });
    await service.handleRazorpayWebhook(body, sign(body));
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });
  });

  it('delegates subscription events to partner billing', async () => {
    billing.handleSubscriptionEvent.mockResolvedValue({ handled: true });
    const body = JSON.stringify({
      event: 'subscription.charged',
      payload: { subscription: { entity: { id: 'sub_1' } } },
    });
    const res = await service.handleRazorpayWebhook(body, sign(body));
    expect(billing.handleSubscriptionEvent).toHaveBeenCalledWith(
      'subscription.charged',
      { id: 'sub_1' },
    );
    expect(res.handled).toBe(true);
  });

  it('returns 200-style ok for unknown events', async () => {
    const body = JSON.stringify({ event: 'something.else' });
    const res = await service.handleRazorpayWebhook(body, sign(body));
    expect(res).toMatchObject({ status: 'ok', handled: false });
  });

  describe('verifyRazorpayPayment', () => {
    const order = { id: 'o1', buyerUserId: 'u1', paymentStatus: 'PENDING' };
    const dto = (over = {}) => ({
      orderId: 'o1',
      razorpayOrderId: 'order_rzp1',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: hmacSha256Hex('order_rzp1|pay_1', 'secret'),
      ...over,
    });

    beforeEach(() => {
      prisma.order.findUnique.mockResolvedValue(order);
    });

    it('rejects a payment whose gateway order was not created for this order', async () => {
      razorpayFindFirstResult = null;
      await expect(
        service.verifyRazorpayPayment('u1', 'BUYER' as never, dto()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('rejects forged sandbox ids with no sandbox intent', async () => {
      razorpayFindFirstResult = {
        id: 'tx1',
        status: TransactionStatus.CREATED,
        metadata: { sandboxMode: false },
      };
      await expect(
        service.verifyRazorpayPayment(
          'u1',
          'BUYER' as never,
          dto({ razorpayOrderId: 'order_sand_forged' }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects sandbox verification on the production deploy', async () => {
      process.env.GARUD_DEPLOY_ENV = 'production';
      razorpayFindFirstResult = {
        id: 'tx1',
        status: TransactionStatus.CREATED,
        metadata: { sandboxMode: true },
      };
      await expect(
        service.verifyRazorpayPayment(
          'u1',
          'BUYER' as never,
          dto({ razorpayOrderId: 'order_sand_x' }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('is idempotent when the transaction is already SUCCESS', async () => {
      razorpayFindFirstResult = {
        id: 'tx1',
        status: TransactionStatus.SUCCESS,
        gatewayPaymentId: 'pay_1',
        metadata: {},
      };
      prisma.order.findUnique.mockResolvedValue({
        ...order,
        paymentStatus: PaymentStatus.PAID,
      });
      const ok = await service.verifyRazorpayPayment(
        'u1',
        'BUYER' as never,
        dto(),
      );
      expect(ok.success).toBe(true);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('rejects verify on a FAILED intent', async () => {
      razorpayFindFirstResult = {
        id: 'tx1',
        status: TransactionStatus.FAILED,
        metadata: {},
      };
      await expect(
        service.verifyRazorpayPayment('u1', 'BUYER' as never, dto()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a bad signature and accepts a good one', async () => {
      razorpayFindFirstResult = {
        id: 'tx1',
        status: TransactionStatus.CREATED,
        metadata: {},
      };
      await expect(
        service.verifyRazorpayPayment(
          'u1',
          'BUYER' as never,
          dto({ razorpaySignature: 'nope' }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      const ok = await service.verifyRazorpayPayment(
        'u1',
        'BUYER' as never,
        dto(),
      );
      expect(ok.success).toBe(true);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { paymentStatus: PaymentStatus.PAID },
      });
    });
  });
});
