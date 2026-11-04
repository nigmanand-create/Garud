import { PartnerSubscriptionStatus, PlanBillingPeriod } from '@prisma/client';
import {
  DEFAULT_PLANS,
  describeEntitlements,
  monthlyEquivalentInr,
  planKeyFromName,
  subscriptionGrantsPlan,
} from './plan-catalog';

const day = 86_400_000;

describe('plan-catalog', () => {
  it('ships exactly one free default plan', () => {
    const defaults = DEFAULT_PLANS.filter((p) => p.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].priceInr).toBe(0);
  });

  it('describes entitlements without duplicating admin features', () => {
    const out = describeEntitlements({
      listingLimit: 10,
      featuredPlacement: true,
      rfqPriority: false,
      features: ['Up to 10 listings', 'Phone support'],
    });
    expect(out).toEqual([
      'Up to 10 listings',
      'Featured marketplace placement',
      'Phone support',
    ]);
    expect(
      describeEntitlements({
        listingLimit: null,
        featuredPlacement: false,
        rfqPriority: true,
        features: [],
      }),
    ).toEqual(['Unlimited listings', 'Priority RFQ visibility']);
  });

  it('grants access for active, grace for past due, none otherwise', () => {
    const now = new Date('2026-06-15T00:00:00Z');
    const base = { currentPeriodEnd: null, cancelledAt: null };
    expect(subscriptionGrantsPlan(null, now)).toBe(false);
    expect(
      subscriptionGrantsPlan(
        { ...base, status: PartnerSubscriptionStatus.ACTIVE },
        now,
      ),
    ).toBe(true);
    expect(
      subscriptionGrantsPlan(
        { ...base, status: PartnerSubscriptionStatus.PAST_DUE },
        now,
      ),
    ).toBe(true);
    expect(
      subscriptionGrantsPlan(
        { ...base, status: PartnerSubscriptionStatus.PENDING_PAYMENT },
        now,
      ),
    ).toBe(false);
    expect(
      subscriptionGrantsPlan(
        { ...base, status: PartnerSubscriptionStatus.CANCELLED },
        now,
      ),
    ).toBe(false);
  });

  it('keeps access until the paid period ends after cancel-at-period-end', () => {
    const now = new Date('2026-06-15T00:00:00Z');
    const cancelled = {
      status: PartnerSubscriptionStatus.ACTIVE,
      cancelledAt: new Date(now.getTime() - day),
    };
    expect(
      subscriptionGrantsPlan(
        { ...cancelled, currentPeriodEnd: new Date(now.getTime() + day) },
        now,
      ),
    ).toBe(true);
    expect(
      subscriptionGrantsPlan(
        { ...cancelled, currentPeriodEnd: new Date(now.getTime() - 1) },
        now,
      ),
    ).toBe(false);
  });

  it('normalises MRR and plan keys', () => {
    expect(monthlyEquivalentInr(1200, PlanBillingPeriod.YEARLY)).toBe(100);
    expect(monthlyEquivalentInr(500, PlanBillingPeriod.MONTHLY)).toBe(500);
    expect(planKeyFromName(' Pro  Plus! ')).toBe('PRO_PLUS');
  });
});
