/** Pure helpers for partner plans / billing UI (PRD Phase 6 · C4). */

export type BillingMode = 'LIVE' | 'SANDBOX' | 'UNAVAILABLE';
export type BillingPeriod = 'MONTHLY' | 'YEARLY';

export type PlanLike = {
  key: string;
  name: string;
  priceInr: number;
  billingPeriod: BillingPeriod;
  isCurrent?: boolean;
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function formatPlanPrice(priceInr: number, period: BillingPeriod): string {
  if (priceInr <= 0) return 'Free';
  return `${inr(priceInr)} / ${period === 'YEARLY' ? 'year' : 'month'}`;
}

export type PlanAction = {
  label: string;
  disabled: boolean;
  /** Short explanation shown under a disabled button. */
  reason?: string;
};

/** What the CTA on a plan card should say / do for the partner's current state. */
export function planAction(
  plan: PlanLike,
  ctx: {
    mode: BillingMode;
    currentPlanKey: string;
    currentIsPaid: boolean;
    cancelsAtPeriodEnd: boolean;
  },
): PlanAction {
  if (plan.key === ctx.currentPlanKey && !ctx.cancelsAtPeriodEnd) {
    return { label: 'Current plan', disabled: true };
  }
  if (plan.priceInr <= 0) {
    return ctx.currentIsPaid && !ctx.cancelsAtPeriodEnd
      ? {
          label: 'Switch to free',
          disabled: true,
          reason: 'Cancel your paid subscription first.',
        }
      : { label: 'Switch to this plan', disabled: false };
  }
  if (ctx.mode === 'UNAVAILABLE') {
    return {
      label: 'Contact us to upgrade',
      disabled: true,
      reason: 'Online billing is not enabled yet.',
    };
  }
  if (ctx.currentIsPaid && !ctx.cancelsAtPeriodEnd) {
    return {
      label: 'Change plan',
      disabled: true,
      reason: 'Cancel your current subscription first, then pick a new plan.',
    };
  }
  return { label: `Upgrade to ${plan.name}`, disabled: false };
}

export function billingModeNotice(mode: BillingMode): string | null {
  switch (mode) {
    case 'LIVE':
      return null;
    case 'SANDBOX':
      return 'Billing runs in test mode on this environment — no real charge is made.';
    case 'UNAVAILABLE':
      return 'Online billing is not enabled yet. Contact GarudHub support to change plans.';
  }
}

export function usageSummary(usage: { listings: number; listingLimit: number | null }): {
  text: string;
  percent: number | null;
  nearLimit: boolean;
  atLimit: boolean;
} {
  if (usage.listingLimit == null) {
    return {
      text: `${usage.listings} listings (no limit)`,
      percent: null,
      nearLimit: false,
      atLimit: false,
    };
  }
  const percent =
    usage.listingLimit === 0
      ? 100
      : Math.min(Math.round((usage.listings / usage.listingLimit) * 100), 100);
  return {
    text: `${usage.listings} of ${usage.listingLimit} listings`,
    percent,
    nearLimit: percent >= 80,
    atLimit: usage.listings >= usage.listingLimit,
  };
}

/** Admin textarea (one feature per line) → trimmed, de-blanked list. */
export function parseFeatureLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export type PlanFormValues = {
  name: string;
  description: string;
  priceInr: string;
  listingLimit: string; // '' = unlimited
  billingPeriod: BillingPeriod;
  featuredPlacement: boolean;
  rfqPriority: boolean;
  featuresText: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: string;
};

/** Validates the admin plan form; returns a payload or an error message. */
export function buildPlanPayload(
  v: PlanFormValues,
):
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!v.name.trim()) return { ok: false, error: 'Name is required.' };
  if (!v.description.trim()) return { ok: false, error: 'Description is required.' };
  const price = Number(v.priceInr);
  if (v.priceInr.trim() === '' || !Number.isFinite(price) || price < 0) {
    return { ok: false, error: 'Price must be 0 or more.' };
  }
  let listingLimit: number | null = null;
  if (v.listingLimit.trim() !== '') {
    const n = Number(v.listingLimit);
    if (!Number.isInteger(n) || n < 0) {
      return { ok: false, error: 'Listing limit must be a whole number (or blank for unlimited).' };
    }
    listingLimit = n;
  }
  if (v.isDefault && price > 0) {
    return { ok: false, error: 'The default plan must be free.' };
  }
  const sort = v.sortOrder.trim() === '' ? 100 : Number(v.sortOrder);
  if (!Number.isInteger(sort) || sort < 0) {
    return { ok: false, error: 'Sort order must be a whole number.' };
  }
  return {
    ok: true,
    payload: {
      name: v.name.trim(),
      description: v.description.trim(),
      priceInr: price,
      billingPeriod: v.billingPeriod,
      listingLimit,
      featuredPlacement: v.featuredPlacement,
      rfqPriority: v.rfqPriority,
      features: parseFeatureLines(v.featuresText),
      isActive: v.isActive,
      isDefault: v.isDefault,
      sortOrder: sort,
    },
  };
}
