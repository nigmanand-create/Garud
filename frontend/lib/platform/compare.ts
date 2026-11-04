/** Product compare v1 — selection lives in localStorage; the compare page reads `?ids=`. */
export const COMPARE_MAX = 4;
export const COMPARE_STORAGE_KEY = 'garud:compare';
export const COMPARE_EVENT = 'garud:compare-change';

const ID_RE = /^[0-9a-f-]{8,64}$/i;

export function sanitizeCompareIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id === 'string' && ID_RE.test(id) && !out.includes(id)) out.push(id);
    if (out.length >= COMPARE_MAX) break;
  }
  return out;
}

export function parseCompareIdsParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return sanitizeCompareIds(raw.split(',').map((s) => s.trim()));
}

export function toggleCompareId(current: string[], id: string): string[] {
  if (current.includes(id)) return current.filter((x) => x !== id);
  if (current.length >= COMPARE_MAX) return current;
  return [...current, id];
}

export function readCompareIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return sanitizeCompareIds(JSON.parse(window.localStorage.getItem(COMPARE_STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function writeCompareIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(sanitizeCompareIds(ids)));
  } catch {
    // storage unavailable (private mode) — compare simply won't persist
  }
  window.dispatchEvent(new Event(COMPARE_EVENT));
}

export function compareHref(ids: string[]): string {
  return `/marketplace/compare?ids=${sanitizeCompareIds(ids).join(',')}`;
}

export type CompareRow = {
  key: string;
  label: string;
  /** True when the values differ between products (used to highlight differences). */
  differs: boolean;
  values: string[];
};

type CompareListing = {
  brand?: string | null;
  category: string;
  listingType: string;
  priceOnRequest: boolean;
  priceInr?: string | null;
  minOrderQuantity?: number | null;
  warranty?: string | null;
  technicalSpecs?: string | null;
  applications?: string[];
  sku?: string | null;
  organization: {
    companyName: string;
    city?: string | null;
    state?: string | null;
  };
};

const DASH = '—';

/** Build matrix rows for the compare page. `categoryLabel`/`priceLabel` are injected to keep this pure. */
export function buildCompareRows(
  listings: CompareListing[],
  fmt: {
    categoryLabel: (c: string) => string;
    priceLabel: (priceOnRequest: boolean, priceInr?: string | null) => string;
  },
): CompareRow[] {
  const defs: { key: string; label: string; get: (l: CompareListing) => string }[] = [
    { key: 'price', label: 'Price', get: (l) => fmt.priceLabel(l.priceOnRequest, l.priceInr) },
    { key: 'brand', label: 'Brand / manufacturer', get: (l) => l.brand?.trim() || DASH },
    { key: 'category', label: 'Category', get: (l) => fmt.categoryLabel(l.category) },
    { key: 'sku', label: 'SKU / model', get: (l) => l.sku?.trim() || DASH },
    { key: 'moq', label: 'Min. order qty', get: (l) => (l.minOrderQuantity != null ? String(l.minOrderQuantity) : DASH) },
    { key: 'warranty', label: 'Warranty', get: (l) => l.warranty?.trim() || DASH },
    {
      key: 'applications',
      label: 'Applications',
      get: (l) => (l.applications?.length ? l.applications.join(', ') : DASH),
    },
    { key: 'specs', label: 'Technical specs', get: (l) => l.technicalSpecs?.trim() || DASH },
    { key: 'vendor', label: 'Sold by', get: (l) => l.organization.companyName },
    {
      key: 'location',
      label: 'Vendor location',
      get: (l) => [l.organization.city, l.organization.state].filter(Boolean).join(', ') || DASH,
    },
  ];

  return defs.map((d) => {
    const values = listings.map(d.get);
    return {
      key: d.key,
      label: d.label,
      values,
      differs: new Set(values).size > 1,
    };
  });
}
