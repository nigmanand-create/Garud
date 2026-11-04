import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_RANGES,
  barHeights,
  formatDelta,
  formatInrCompact,
  funnelDropoffs,
} from '../platform/admin-analytics';
import {
  billingModeNotice,
  buildPlanPayload,
  formatPlanPrice,
  parseFeatureLines,
  planAction,
  usageSummary,
  type PlanFormValues,
} from '../platform/partner-billing';
import { isSingleSellerConflict, SINGLE_SELLER_POLICY } from '../platform/cart';
import { ApiError } from '../api/types';

describe('partner billing helpers', () => {
  it('formats plan prices', () => {
    expect(formatPlanPrice(0, 'MONTHLY')).toBe('Free');
    expect(formatPlanPrice(4999, 'MONTHLY')).toBe('₹4,999 / month');
    expect(formatPlanPrice(49999, 'YEARLY')).toBe('₹49,999 / year');
  });

  const paid = { key: 'GROWTH', name: 'Growth', priceInr: 4999, billingPeriod: 'MONTHLY' as const };
  const free = { key: 'FOUNDING_PARTNER', name: 'Founding', priceInr: 0, billingPeriod: 'MONTHLY' as const };
  const ctx = {
    mode: 'LIVE' as const,
    currentPlanKey: 'FOUNDING_PARTNER',
    currentIsPaid: false,
    cancelsAtPeriodEnd: false,
  };

  it('derives the plan card action', () => {
    expect(planAction(free, ctx)).toMatchObject({ label: 'Current plan', disabled: true });
    expect(planAction(paid, ctx)).toMatchObject({ label: 'Upgrade to Growth', disabled: false });
    expect(planAction(paid, { ...ctx, mode: 'UNAVAILABLE' })).toMatchObject({ disabled: true });
    expect(
      planAction(
        { ...paid, key: 'ENTERPRISE', name: 'Enterprise' },
        { ...ctx, currentPlanKey: 'GROWTH', currentIsPaid: true },
      ),
    ).toMatchObject({ disabled: true });
    // after cancel-at-period-end the partner may pick a plan again
    expect(
      planAction(paid, {
        ...ctx,
        currentPlanKey: 'GROWTH',
        currentIsPaid: true,
        cancelsAtPeriodEnd: true,
      }),
    ).toMatchObject({ disabled: false });
  });

  it('explains the billing mode', () => {
    expect(billingModeNotice('LIVE')).toBeNull();
    expect(billingModeNotice('SANDBOX')).toMatch(/test mode/);
    expect(billingModeNotice('UNAVAILABLE')).toMatch(/not enabled/);
  });

  it('summarises listing usage', () => {
    expect(usageSummary({ listings: 3, listingLimit: null })).toMatchObject({
      percent: null,
      atLimit: false,
    });
    expect(usageSummary({ listings: 8, listingLimit: 10 })).toMatchObject({
      percent: 80,
      nearLimit: true,
      atLimit: false,
    });
    expect(usageSummary({ listings: 12, listingLimit: 10 })).toMatchObject({
      percent: 100,
      atLimit: true,
    });
  });

  const form: PlanFormValues = {
    name: ' Pro ',
    description: 'desc',
    priceInr: '999',
    listingLimit: '',
    billingPeriod: 'MONTHLY',
    featuredPlacement: true,
    rfqPriority: false,
    featuresText: ' a \n\n b ',
    isActive: true,
    isDefault: false,
    sortOrder: '',
  };

  it('parses feature lines', () => {
    expect(parseFeatureLines(' a \n\n b ')).toEqual(['a', 'b']);
  });

  it('builds and validates the plan payload', () => {
    const ok = buildPlanPayload(form);
    expect(ok).toEqual({
      ok: true,
      payload: expect.objectContaining({
        name: 'Pro',
        priceInr: 999,
        listingLimit: null,
        features: ['a', 'b'],
        sortOrder: 100,
      }),
    });
    expect(buildPlanPayload({ ...form, name: ' ' })).toMatchObject({ ok: false });
    expect(buildPlanPayload({ ...form, priceInr: '-1' })).toMatchObject({ ok: false });
    expect(buildPlanPayload({ ...form, listingLimit: '1.5' })).toMatchObject({ ok: false });
    expect(buildPlanPayload({ ...form, isDefault: true })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/free/),
    });
    expect(buildPlanPayload({ ...form, listingLimit: '25' })).toMatchObject({
      ok: true,
      payload: expect.objectContaining({ listingLimit: 25 }),
    });
  });
});

describe('admin analytics helpers', () => {
  it('formats INR compactly', () => {
    expect(formatInrCompact(1234)).toBe('₹1,234');
    expect(formatInrCompact(250000)).toBe('₹2.5 L');
    expect(formatInrCompact(25000000)).toBe('₹2.5 Cr');
  });

  it('formats period deltas', () => {
    expect(formatDelta(null)).toEqual({ text: 'no prior data', tone: 'none' });
    expect(formatDelta(12.5)).toEqual({ text: '+12.5% vs prev', tone: 'up' });
    expect(formatDelta(-4)).toEqual({ text: '−4% vs prev', tone: 'down' });
    expect(formatDelta(0).tone).toBe('flat');
  });

  it('scales bar heights', () => {
    expect(barHeights([0, 0])).toEqual([0, 0]);
    expect(barHeights([50, 100, 0])).toEqual([50, 100, 0]);
    expect(barHeights([1, 1000])[0]).toBeGreaterThanOrEqual(3);
  });

  it('computes funnel drop-offs', () => {
    const steps = [
      { key: 'a', label: 'A', count: 10, ratePct: 100 },
      { key: 'b', label: 'B', count: 4, ratePct: 40 },
      { key: 'c', label: 'C', count: 0, ratePct: 0 },
    ];
    expect(funnelDropoffs(steps)).toEqual([
      { from: 'A', to: 'B', lostPct: 60 },
      { from: 'B', to: 'C', lostPct: 100 },
    ]);
    expect(funnelDropoffs([{ key: 'a', label: 'A', count: 0, ratePct: 0 }, steps[1]])[0].lostPct).toBe(0);
  });

  it('offers sensible ranges', () => {
    expect(ANALYTICS_RANGES.map((r) => r.days)).toEqual([7, 30, 90, 365]);
  });
});

describe('single-seller cart policy', () => {
  it('recognises the cross-seller conflict (409) only', () => {
    expect(isSingleSellerConflict(new ApiError(409, { message: 'x' }))).toBe(true);
    expect(isSingleSellerConflict(new ApiError(422, { message: 'x' }))).toBe(false);
    expect(isSingleSellerConflict(new Error('x'))).toBe(false);
    expect(SINGLE_SELLER_POLICY).toMatch(/RFQ/);
  });
});
