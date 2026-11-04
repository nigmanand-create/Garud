import { PartnerSubscriptionStatus, PlanBillingPeriod } from '@prisma/client';

/** Seed plans created on first read when the catalog is empty. Admins can edit them afterwards. */
export const DEFAULT_PLANS = [
  {
    key: 'FOUNDING_PARTNER',
    name: 'Founding Partner',
    description:
      'Complimentary access during the GarudHub launch period. Paid plans never apply automatically.',
    priceInr: 0,
    billingPeriod: PlanBillingPeriod.MONTHLY,
    listingLimit: null as number | null,
    featuredPlacement: false,
    rfqPriority: false,
    isDefault: true,
    sortOrder: 0,
    features: [
      'Verified partner profile and marketplace presence',
      'Product and service listings (moderated)',
      'RFQ inbox, quotations, and order management',
      'Enquiry and lead inbox, buyer messaging, analytics',
    ],
  },
  {
    key: 'GROWTH',
    name: 'Growth',
    description:
      'For active sellers: more listings and priority RFQ visibility.',
    priceInr: 4999,
    billingPeriod: PlanBillingPeriod.MONTHLY,
    listingLimit: 100,
    featuredPlacement: false,
    rfqPriority: true,
    isDefault: false,
    sortOrder: 10,
    features: [
      'Everything in Founding Partner',
      'Up to 100 listings',
      'Priority placement in RFQ invitations',
    ],
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Unlimited listings with featured marketplace placement.',
    priceInr: 14999,
    billingPeriod: PlanBillingPeriod.MONTHLY,
    listingLimit: null as number | null,
    featuredPlacement: true,
    rfqPriority: true,
    isDefault: false,
    sortOrder: 20,
    features: [
      'Everything in Growth',
      'Unlimited listings',
      'Featured placement on marketplace',
      'Dedicated account support',
    ],
  },
] as const;

export type PlanEntitlementFields = {
  listingLimit: number | null;
  featuredPlacement: boolean;
  rfqPriority: boolean;
  features: string[];
};

/** Bullet list for the pricing UI: derived entitlements first, then admin-written features. */
export function describeEntitlements(plan: PlanEntitlementFields): string[] {
  const derived = [
    plan.listingLimit == null
      ? 'Unlimited listings'
      : `Up to ${plan.listingLimit} listings`,
    ...(plan.featuredPlacement ? ['Featured marketplace placement'] : []),
    ...(plan.rfqPriority ? ['Priority RFQ visibility'] : []),
  ];
  const extra = plan.features.filter(
    (f) => !derived.some((d) => d.toLowerCase() === f.toLowerCase()),
  );
  return [...derived, ...extra];
}

export type SubscriptionLike = {
  status: PartnerSubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
} | null;

/**
 * Whether a subscription row currently grants its plan.
 * ACTIVE grants; PAST_DUE keeps access (grace until the gateway cancels it);
 * a cancel-at-period-end subscription lapses once the paid period is over.
 */
export function subscriptionGrantsPlan(
  sub: SubscriptionLike,
  now: Date = new Date(),
): boolean {
  if (!sub) return false;
  if (
    sub.status !== PartnerSubscriptionStatus.ACTIVE &&
    sub.status !== PartnerSubscriptionStatus.PAST_DUE
  ) {
    return false;
  }
  if (sub.cancelledAt && sub.currentPeriodEnd && sub.currentPeriodEnd < now) {
    return false;
  }
  return true;
}

/** Monthly-equivalent revenue of a plan (yearly plans are divided by 12). */
export function monthlyEquivalentInr(
  priceInr: number,
  period: PlanBillingPeriod,
): number {
  return period === PlanBillingPeriod.YEARLY ? priceInr / 12 : priceInr;
}

export function planKeyFromName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}
