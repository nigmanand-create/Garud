import { describe, expect, it } from 'vitest';
import { BUSINESS_OPPORTUNITIES, RFQ_STEPS } from '../platform/business-opportunities';
import {
  buildCompareRows,
  COMPARE_MAX,
  compareHref,
  parseCompareIdsParam,
  sanitizeCompareIds,
  toggleCompareId,
} from '../platform/compare';
import {
  buildDistributorMessage,
  buildDistributorSubject,
  parseDistributorType,
} from '../platform/distributor';
import {
  computeQuoteBest,
  sortQuotes,
  summarizeQuotes,
  type QuoteLike,
} from '../platform/quote-compare';

describe('business opportunities (spec §1.4)', () => {
  it('has the four spec blocks, each routed to a first-party flow', () => {
    expect(BUSINESS_OPPORTUNITIES.map((o) => o.id)).toEqual([
      'distributor',
      'dealership',
      'projects',
      'partnerships',
    ]);
    for (const o of BUSINESS_OPPORTUNITIES) {
      expect(o.href.startsWith('/')).toBe(true);
    }
    expect(BUSINESS_OPPORTUNITIES[0].href).toContain('type=DISTRIBUTOR');
    expect(BUSINESS_OPPORTUNITIES[1].href).toContain('type=DEALER');
  });

  it('describes the 5-step RFQ flow', () => {
    expect(RFQ_STEPS).toHaveLength(5);
  });
});

describe('distributor flow', () => {
  it('defaults unknown types to DISTRIBUTOR', () => {
    expect(parseDistributorType('dealer')).toBe('DEALER');
    expect(parseDistributorType('nonsense')).toBe('DISTRIBUTOR');
    expect(parseDistributorType(null)).toBe('DISTRIBUTOR');
  });

  it('builds subject with product context', () => {
    expect(buildDistributorSubject('DISTRIBUTOR', 'AgriX 10L')).toBe(
      'Distributorship request: AgriX 10L',
    );
    expect(buildDistributorSubject('DEALER')).toBe('Dealership request');
  });

  it('builds a structured message and omits empty optional fields', () => {
    const msg = buildDistributorMessage({
      type: 'DEALER',
      company: ' Sky Traders ',
      territory: 'Pune region',
      experience: '',
      annualVolume: '40 units',
      notes: '',
      productName: 'AgriX 10L',
      supplierName: 'AgriFly',
    });
    expect(msg).toContain('Request type: Dealer / reseller');
    expect(msg).toContain('Product / range: AgriX 10L');
    expect(msg).toContain('Company: Sky Traders');
    expect(msg).toContain('Proposed territory: Pune region');
    expect(msg).toContain('Expected annual volume: 40 units');
    expect(msg).not.toContain('Relevant experience');
    expect(msg).not.toContain('Notes:');
  });
});

describe('product compare v1', () => {
  const a = '11111111-1111-1111-1111-111111111111';
  const b = '22222222-2222-2222-2222-222222222222';

  it('sanitizes, dedupes and caps ids', () => {
    expect(sanitizeCompareIds([a, a, 'bad id!', b])).toEqual([a, b]);
    const many = Array.from({ length: 8 }, (_, i) => `0000000${i}-aaaa-bbbb-cccc-000000000000`);
    expect(sanitizeCompareIds(many)).toHaveLength(COMPARE_MAX);
    expect(sanitizeCompareIds('nope')).toEqual([]);
  });

  it('parses the ids query param', () => {
    expect(parseCompareIdsParam(`${a}, ${b},xx`)).toEqual([a, b]);
    expect(parseCompareIdsParam(null)).toEqual([]);
  });

  it('toggles ids and refuses to exceed the max', () => {
    expect(toggleCompareId([a], b)).toEqual([a, b]);
    expect(toggleCompareId([a, b], a)).toEqual([b]);
    const full = ['a1a1a1a1', 'b2b2b2b2', 'c3c3c3c3', 'd4d4d4d4'];
    expect(toggleCompareId(full, 'e5e5e5e5')).toEqual(full);
  });

  it('builds the compare href', () => {
    expect(compareHref([a, b])).toBe(`/marketplace/compare?ids=${a},${b}`);
  });

  it('flags rows that differ between products', () => {
    const base = {
      category: 'CAMERA_DRONE',
      listingType: 'PRODUCT',
      organization: { companyName: 'X', city: 'Pune', state: 'MH' },
    };
    const rows = buildCompareRows(
      [
        { ...base, priceOnRequest: false, priceInr: '1000', warranty: '1 year' },
        { ...base, priceOnRequest: true, warranty: '1 year' },
      ],
      {
        categoryLabel: (c) => c,
        priceLabel: (por, p) => (por ? 'Price on request' : `₹${p}`),
      },
    );
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.price.differs).toBe(true);
    expect(byKey.warranty.differs).toBe(false);
    expect(byKey.sku.values).toEqual(['—', '—']);
    expect(byKey.location.values[0]).toBe('Pune, MH');
  });
});

describe('RFQ quote compare v2', () => {
  const q = (over: Partial<QuoteLike> & { id: string }): QuoteLike => ({
    status: 'SUBMITTED',
    priceOnRequest: false,
    priceInr: null,
    ...over,
  });

  const quotes = [
    q({ id: 'a', priceInr: '900', leadTimeDays: 20, quotedPayloadKg: 5, warrantyMonths: 12, createdAt: '2026-11-01' }),
    q({ id: 'b', priceInr: '700', leadTimeDays: 30, quotedPayloadKg: 8, warrantyMonths: 12, createdAt: '2026-11-03' }),
    q({ id: 'c', priceOnRequest: true, leadTimeDays: 10, createdAt: '2026-11-02' }),
    q({ id: 'd', priceInr: '100', status: 'REJECTED', leadTimeDays: 1 }),
  ];

  it('picks best per column, ignoring rejected bids and ties', () => {
    const best = computeQuoteBest(quotes);
    expect(best.price).toBe('b');
    expect(best.lead).toBe('c');
    expect(best.payload).toBe('b');
    expect(best.warranty).toBeNull(); // tie
    expect(best.endurance).toBeNull(); // no data
  });

  it('does not highlight with fewer than two comparable bids', () => {
    expect(computeQuoteBest([quotes[0]]).price).toBeNull();
  });

  it('sorts with missing values last', () => {
    expect(sortQuotes(quotes, 'price').map((x) => x.id)).toEqual(['d', 'b', 'a', 'c']);
    expect(sortQuotes(quotes, 'lead').map((x) => x.id)).toEqual(['d', 'c', 'a', 'b']);
    expect(sortQuotes(quotes, 'payload').map((x) => x.id).slice(0, 2)).toEqual(['b', 'a']);
    expect(sortQuotes(quotes, 'submitted').map((x) => x.id).slice(0, 3)).toEqual(['b', 'c', 'a']);
  });

  it('summarizes price spread across active bids', () => {
    const s = summarizeQuotes(quotes);
    expect(s.total).toBe(4);
    expect(s.active).toBe(3);
    expect(s.lowestPrice).toBe(700);
    expect(s.highestPrice).toBe(900);
    expect(s.priceSpreadPct).toBe(29);
    expect(s.fastestLeadDays).toBe(10);
  });
});
