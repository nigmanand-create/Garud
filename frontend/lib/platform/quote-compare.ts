/** RFQ quotation compare v2 — pure helpers for sorting and best-in-column highlighting. */
export type QuoteLike = {
  id: string;
  status: string;
  createdAt?: string;
  priceOnRequest: boolean;
  priceInr?: string | null;
  leadTimeDays?: number | null;
  quotedPayloadKg?: string | number | null;
  quotedEnduranceMin?: number | null;
  warrantyMonths?: number | null;
  dgcaModelNumber?: string | null;
};

export type QuoteSortKey = 'submitted' | 'price' | 'lead' | 'payload' | 'endurance' | 'warranty';

export const QUOTE_SORT_OPTIONS: { value: QuoteSortKey; label: string }[] = [
  { value: 'submitted', label: 'Newest first' },
  { value: 'price', label: 'Price: low to high' },
  { value: 'lead', label: 'Lead time: fastest' },
  { value: 'payload', label: 'Payload: highest' },
  { value: 'endurance', label: 'Endurance: highest' },
  { value: 'warranty', label: 'Warranty: longest' },
];

export type QuoteBest = {
  price: string | null;
  lead: string | null;
  payload: string | null;
  endurance: string | null;
  warranty: string | null;
};

function num(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function priceOf(q: QuoteLike): number | null {
  return q.priceOnRequest ? null : num(q.priceInr);
}

/** Quotes that can still win (rejected bids are shown but never highlighted as best). */
function contenders(quotes: QuoteLike[]): QuoteLike[] {
  return quotes.filter((q) => q.status !== 'REJECTED');
}

function bestId(
  quotes: QuoteLike[],
  pick: (q: QuoteLike) => number | null,
  direction: 'min' | 'max',
): string | null {
  const scored = contenders(quotes)
    .map((q) => ({ id: q.id, v: pick(q) }))
    .filter((x): x is { id: string; v: number } => x.v != null);
  // Highlighting only means something when there is something to compare against.
  if (scored.length < 2) return null;
  scored.sort((a, b) => (direction === 'min' ? a.v - b.v : b.v - a.v));
  // A tie for best is not a differentiator.
  if (scored[0].v === scored[1].v) return null;
  return scored[0].id;
}

export function computeQuoteBest(quotes: QuoteLike[]): QuoteBest {
  return {
    price: bestId(quotes, priceOf, 'min'),
    lead: bestId(quotes, (q) => num(q.leadTimeDays), 'min'),
    payload: bestId(quotes, (q) => num(q.quotedPayloadKg), 'max'),
    endurance: bestId(quotes, (q) => num(q.quotedEnduranceMin), 'max'),
    warranty: bestId(quotes, (q) => num(q.warrantyMonths), 'max'),
  };
}

/** Missing values always sort last so incomplete bids don't float to the top. */
export function sortQuotes<T extends QuoteLike>(
  quotes: T[],
  key: QuoteSortKey,
): T[] {
  const get: Record<QuoteSortKey, (q: T) => number | null> = {
    submitted: (q) => (q.createdAt ? -new Date(q.createdAt).getTime() : null),
    price: priceOf,
    lead: (q) => num(q.leadTimeDays),
    payload: (q) => {
      const v = num(q.quotedPayloadKg);
      return v == null ? null : -v;
    },
    endurance: (q) => {
      const v = num(q.quotedEnduranceMin);
      return v == null ? null : -v;
    },
    warranty: (q) => {
      const v = num(q.warrantyMonths);
      return v == null ? null : -v;
    },
  };
  return [...quotes].sort((a, b) => {
    const av = get[key](a);
    const bv = get[key](b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av - bv;
  });
}

export type QuoteSummary = {
  total: number;
  active: number;
  lowestPrice: number | null;
  highestPrice: number | null;
  fastestLeadDays: number | null;
  /** Spread between highest and lowest priced active bid, as a percentage of the lowest. */
  priceSpreadPct: number | null;
};

export function summarizeQuotes(quotes: QuoteLike[]): QuoteSummary {
  const active = contenders(quotes);
  const prices = active.map(priceOf).filter((v): v is number => v != null);
  const leads = active.map((q) => num(q.leadTimeDays)).filter((v): v is number => v != null);
  const lowest = prices.length ? Math.min(...prices) : null;
  const highest = prices.length ? Math.max(...prices) : null;
  return {
    total: quotes.length,
    active: active.length,
    lowestPrice: lowest,
    highestPrice: highest,
    fastestLeadDays: leads.length ? Math.min(...leads) : null,
    priceSpreadPct:
      lowest != null && highest != null && lowest > 0 && prices.length > 1
        ? Math.round(((highest - lowest) / lowest) * 100)
        : null,
  };
}
