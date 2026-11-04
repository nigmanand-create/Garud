import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PartnerSubscriptionStatus, PlanBillingPeriod } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { hmacSha256Hex } from '../../shared/razorpay/razorpay.util';
import { PartnerBillingService } from './partner-billing.service';

const dec = (n: number) => ({ toString: () => String(n), valueOf: () => n });

const freePlan = {
  id: 'p-free',
  key: 'FOUNDING_PARTNER',
  name: 'Founding Partner',
  description: 'free',
  priceInr: dec(0),
  billingPeriod: PlanBillingPeriod.MONTHLY,
  listingLimit: null,
  featuredPlacement: false,
  rfqPriority: false,
  features: [],
  isActive: true,
  isDefault: true,
  sortOrder: 0,
  razorpayPlanId: null,
};
const growth = {
  ...freePlan,
  id: 'p-growth',
  key: 'GROWTH',
  name: 'Growth',
  priceInr: dec(4999),
  listingLimit: 2,
  isDefault: false,
  sortOrder: 10,
  razorpayPlanId: 'plan_abc',
};

describe('PartnerBillingService', () => {
  let service: PartnerBillingService;
  const env: Record<string, string | undefined> = {};

  const prisma = {
    organization: { findUnique: jest.fn() },
    partnerPlan: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    partnerSubscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
    partnerListing: { count: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    for (const k of Object.keys(env)) delete env[k];
    delete process.env.GARUD_DEPLOY_ENV;
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org1',
      companyName: 'Acme',
    });
    prisma.partnerPlan.count.mockResolvedValue(3);
    prisma.partnerPlan.findFirst.mockResolvedValue(freePlan);
    prisma.partnerPlan.findMany.mockResolvedValue([freePlan, growth]);
    prisma.partnerListing.count.mockResolvedValue(0);
    prisma.partnerSubscription.findUnique.mockResolvedValue(null);
    const mod = await Test.createTestingModule({
      providers: [
        PartnerBillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
      ],
    }).compile();
    service = mod.get(PartnerBillingService);
  });

  afterAll(() => {
    delete process.env.GARUD_DEPLOY_ENV;
  });

  it('reports the default plan, usage and selectable plans', async () => {
    prisma.partnerListing.count.mockResolvedValue(3);
    const res = await service.getSubscription('u');
    expect(res.billingMode).toBe('SANDBOX');
    expect(res.billingEnabled).toBe(false);
    expect(res.plan).toMatchObject({
      key: 'FOUNDING_PARTNER',
      source: 'DEFAULT',
    });
    expect(res.usage).toEqual({ listings: 3, listingLimit: null });
    expect(
      res.plans.map((p) => [p.key, p.isCurrent, p.requiresPayment]),
    ).toEqual([
      ['FOUNDING_PARTNER', true, false],
      ['GROWTH', false, true],
    ]);
  });

  it('is UNAVAILABLE in production without keys and LIVE with keys', () => {
    process.env.GARUD_DEPLOY_ENV = 'production';
    expect(service.billingMode()).toBe('UNAVAILABLE');
    env.RAZORPAY_KEY_ID = 'rzp_live_x';
    env.RAZORPAY_KEY_SECRET = 'secret';
    expect(service.billingMode()).toBe('LIVE');
  });

  it('refuses paid checkout in production without keys', async () => {
    process.env.GARUD_DEPLOY_ENV = 'production';
    prisma.partnerPlan.findUnique.mockResolvedValue(growth);
    await expect(service.checkout('u', 'GROWTH')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.partnerSubscription.upsert).not.toHaveBeenCalled();
  });

  it('creates a sandbox subscription outside production', async () => {
    prisma.partnerPlan.findUnique.mockResolvedValue(growth);
    const res = await service.checkout('u', 'GROWTH');
    expect(res).toMatchObject({ mode: 'CHECKOUT', sandboxMode: true });
    expect((res as { subscriptionId: string }).subscriptionId).toMatch(
      /^sub_sand_/,
    );
    expect(prisma.partnerSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: PartnerSubscriptionStatus.PENDING_PAYMENT,
        }),
      }),
    );
  });

  it('activates a free plan immediately without a gateway', async () => {
    prisma.partnerPlan.findUnique.mockResolvedValue({
      ...freePlan,
      id: 'p-free2',
      key: 'FREE2',
      isDefault: false,
    });
    const res = await service.checkout('u', 'FREE2');
    expect(res.mode).toBe('ACTIVATED');
    expect(prisma.partnerSubscription.upsert).toHaveBeenCalled();
  });

  it('blocks switching while a paid subscription is active', async () => {
    prisma.partnerPlan.findUnique.mockResolvedValue({
      ...growth,
      id: 'p-ent',
      key: 'ENTERPRISE',
    });
    prisma.partnerSubscription.findUnique.mockResolvedValue({
      planId: 'p-growth',
      plan: growth,
      status: PartnerSubscriptionStatus.ACTIVE,
      currentPeriodEnd: null,
      cancelledAt: null,
    });
    await expect(service.checkout('u', 'ENTERPRISE')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects forged sandbox verification when live keys exist', async () => {
    env.RAZORPAY_KEY_ID = 'rzp_test_x';
    env.RAZORPAY_KEY_SECRET = 'secret';
    prisma.partnerSubscription.findUnique.mockResolvedValue({
      id: 's1',
      razorpaySubscriptionId: 'sub_sand_abc',
    });
    await expect(
      service.verifyCheckout('u', {
        razorpaySubscriptionId: 'sub_sand_abc',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'x',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.partnerSubscription.update).not.toHaveBeenCalled();
  });

  it('verifies a real subscription signature then activates', async () => {
    env.RAZORPAY_KEY_ID = 'rzp_test_x';
    env.RAZORPAY_KEY_SECRET = 'secret';
    const sub = {
      id: 's1',
      razorpaySubscriptionId: 'sub_real',
      planId: 'p-growth',
      status: PartnerSubscriptionStatus.PENDING_PAYMENT,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelledAt: null,
      plan: growth,
    };
    prisma.partnerSubscription.findUnique.mockResolvedValue(sub);
    await expect(
      service.verifyCheckout('u', {
        razorpaySubscriptionId: 'sub_real',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'bad',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.verifyCheckout('u', {
      razorpaySubscriptionId: 'sub_real',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: hmacSha256Hex('pay_1|sub_real', 'secret'),
    });
    expect(prisma.partnerSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PartnerSubscriptionStatus.ACTIVE,
        }),
      }),
    );
  });

  describe('listing limit entitlement', () => {
    it('allows unlimited plans', async () => {
      await expect(
        service.assertCanCreateListing('u'),
      ).resolves.toBeUndefined();
    });

    it('blocks creation at the plan limit', async () => {
      prisma.partnerSubscription.findUnique.mockResolvedValue({
        status: PartnerSubscriptionStatus.ACTIVE,
        currentPeriodEnd: null,
        cancelledAt: null,
        plan: growth,
      });
      prisma.partnerListing.count.mockResolvedValue(2);
      await expect(service.assertCanCreateListing('u')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      prisma.partnerListing.count.mockResolvedValue(1);
      await expect(
        service.assertCanCreateListing('u'),
      ).resolves.toBeUndefined();
    });

    it('falls back to the default plan when the subscription lapsed', async () => {
      prisma.partnerSubscription.findUnique.mockResolvedValue({
        status: PartnerSubscriptionStatus.CANCELLED,
        currentPeriodEnd: null,
        cancelledAt: new Date(),
        plan: growth,
      });
      prisma.partnerListing.count.mockResolvedValue(50);
      await expect(
        service.assertCanCreateListing('u'),
      ).resolves.toBeUndefined();
    });
  });

  describe('webhook events', () => {
    it('activates on subscription.charged and stores the period', async () => {
      prisma.partnerSubscription.findUnique.mockResolvedValue({
        id: 's1',
        cancelledAt: null,
      });
      const res = await service.handleSubscriptionEvent(
        'subscription.charged',
        {
          id: 'sub_1',
          current_start: 1_780_000_000,
          current_end: 1_782_592_000,
        },
      );
      expect(res.handled).toBe(true);
      expect(prisma.partnerSubscription.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: {
          status: PartnerSubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(1_780_000_000_000),
          currentPeriodEnd: new Date(1_782_592_000_000),
        },
      });
    });

    it('marks past due on halted and cancelled on cancelled', async () => {
      prisma.partnerSubscription.findUnique.mockResolvedValue({
        id: 's1',
        cancelledAt: null,
      });
      await service.handleSubscriptionEvent('subscription.halted', {
        id: 'sub_1',
      });
      expect(prisma.partnerSubscription.update).toHaveBeenLastCalledWith({
        where: { id: 's1' },
        data: { status: PartnerSubscriptionStatus.PAST_DUE },
      });
      await service.handleSubscriptionEvent('subscription.cancelled', {
        id: 'sub_1',
      });
      expect(prisma.partnerSubscription.update).toHaveBeenLastCalledWith({
        where: { id: 's1' },
        data: expect.objectContaining({
          status: PartnerSubscriptionStatus.CANCELLED,
        }),
      });
    });

    it('ignores unknown subscriptions', async () => {
      prisma.partnerSubscription.findUnique.mockResolvedValue(null);
      const res = await service.handleSubscriptionEvent(
        'subscription.charged',
        {
          id: 'nope',
        },
      );
      expect(res.handled).toBe(false);
      expect(prisma.partnerSubscription.update).not.toHaveBeenCalled();
    });
  });

  describe('admin plans', () => {
    it('lists plans with subscriber counts and monthly MRR', async () => {
      prisma.partnerSubscription.groupBy.mockResolvedValue([
        { planId: 'p-growth', status: 'ACTIVE', _count: { _all: 3 } },
        { planId: 'p-growth', status: 'CANCELLED', _count: { _all: 1 } },
      ]);
      const res = await service.adminListPlans();
      expect(res.mrrInr).toBe(3 * 4999);
      expect(res.plans.find((p) => p.key === 'GROWTH')?.subscribers).toEqual({
        active: 3,
        total: 4,
      });
    });

    it('requires the default plan to stay free and active', async () => {
      prisma.partnerPlan.findUnique.mockResolvedValue(freePlan);
      await expect(
        service.adminUpdatePlan('p-free', { priceInr: 10 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.adminUpdatePlan('p-free', { isActive: false }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('clears the Razorpay plan id when price changes', async () => {
      prisma.partnerPlan.findUnique.mockResolvedValue(growth);
      prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
        fn(prisma),
      );
      prisma.partnerPlan.update.mockResolvedValue({
        ...growth,
        razorpayPlanId: null,
      });
      await service.adminUpdatePlan('p-growth', { priceInr: 5999 });
      expect(prisma.partnerPlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ razorpayPlanId: null }),
        }),
      );
    });
  });
});
