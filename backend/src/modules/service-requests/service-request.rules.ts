import {
  CatalogCategory,
  EnquiryIntent,
  ServiceRequestCategory,
  ServiceRequestStatus,
} from '@prisma/client';

/** Phase 1 `serviceKey` (enquiry / URL query) → service request category. */
export const SERVICE_KEY_CATEGORY: Record<string, ServiceRequestCategory> = {
  repair: ServiceRequestCategory.REPAIR_AMC,
  compliance: ServiceRequestCategory.COMPLIANCE,
  professional: ServiceRequestCategory.PROFESSIONAL,
  finance: ServiceRequestCategory.FINANCE_INSURANCE,
  recycling: ServiceRequestCategory.SCRAP_RECYCLING,
};

export const CATEGORY_SERVICE_KEY: Record<ServiceRequestCategory, string> = {
  REPAIR_AMC: 'repair',
  COMPLIANCE: 'compliance',
  PROFESSIONAL: 'professional',
  FINANCE_INSURANCE: 'finance',
  SCRAP_RECYCLING: 'recycling',
  OTHER: 'service',
};

export const CATEGORY_LABELS: Record<ServiceRequestCategory, string> = {
  REPAIR_AMC: 'Repair & AMC',
  COMPLIANCE: 'DGCA & compliance',
  PROFESSIONAL: 'Professional drone services',
  FINANCE_INSURANCE: 'Finance & insurance',
  SCRAP_RECYCLING: 'Scrap & recycling',
  OTHER: 'Other service',
};

/** Lead type (EnquiryIntent) used for the enquiry created with a service request. */
export const CATEGORY_INTENT: Record<ServiceRequestCategory, EnquiryIntent> = {
  REPAIR_AMC: EnquiryIntent.REPAIR,
  COMPLIANCE: EnquiryIntent.SERVICE,
  PROFESSIONAL: EnquiryIntent.SERVICE,
  FINANCE_INSURANCE: EnquiryIntent.FINANCE,
  SCRAP_RECYCLING: EnquiryIntent.SCRAP,
  OTHER: EnquiryIntent.SERVICE,
};

/** Catalog categories of approved SERVICE listings that imply coverage of a request category. */
export const CATEGORY_CATALOG_CATEGORIES: Partial<
  Record<ServiceRequestCategory, CatalogCategory[]>
> = {
  REPAIR_AMC: [CatalogCategory.REPAIR_MAINTENANCE],
  COMPLIANCE: [CatalogCategory.CONSULTANCY],
  PROFESSIONAL: [CatalogCategory.CONSULTANCY],
};

export function categoryForServiceKey(
  key?: string | null,
): ServiceRequestCategory | null {
  if (!key) return null;
  return SERVICE_KEY_CATEGORY[key.trim().toLowerCase()] ?? null;
}

/** Enquiry intent for a Phase 1 service key (vertical-specific lead types, else SERVICE). */
export function intentForServiceKey(key?: string | null): EnquiryIntent | null {
  const k = key?.trim().toLowerCase();
  if (!k) return null;
  if (k === 'training') return EnquiryIntent.TRAINING;
  if (k === 'tender' || k === 'government') return EnquiryIntent.TENDER;
  const category = categoryForServiceKey(k);
  return category ? CATEGORY_INTENT[category] : EnquiryIntent.SERVICE;
}

// --- Status workflow ---------------------------------------------------------

export const SERVICE_REQUEST_TRANSITIONS: Record<
  ServiceRequestStatus,
  ServiceRequestStatus[]
> = {
  SUBMITTED: ['MATCHED', 'CANCELLED'],
  MATCHED: ['IN_PROGRESS', 'SUBMITTED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(
  from: ServiceRequestStatus,
  to: ServiceRequestStatus,
): boolean {
  return SERVICE_REQUEST_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: ServiceRequestStatus): boolean {
  return SERVICE_REQUEST_TRANSITIONS[status].length === 0;
}

// --- Matching ----------------------------------------------------------------

export const MAX_MATCHES = 5;

export type MatchCandidate = {
  id: string;
  /** Home state of the organization. */
  state: string | null;
  /** Declared coverage; empty = no restriction declared. */
  serviceStates: string[];
  /** True when the provider explicitly ticked this category (vs. inferred from listings). */
  declaredCategory: boolean;
};

export type MatchScope = 'STATE' | 'NATIONAL' | 'NONE';

export function normState(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function coversState(c: MatchCandidate, state: string): boolean {
  const declared = c.serviceStates.map(normState).filter(Boolean);
  if (declared.length > 0) return declared.includes(state);
  return normState(c.state) === state;
}

/**
 * Location + category matching (category is pre-filtered by the query):
 * 1. STATE   — providers covering the request state (declared coverage, or home state when
 *              no coverage is declared).
 * 2. NATIONAL — when nobody covers the state (or the request has no state), providers that
 *              declared no state restriction.
 * Explicitly-declared categories rank before listing-inferred ones; capped at MAX_MATCHES.
 */
export function rankCandidates(
  candidates: MatchCandidate[],
  requestState?: string | null,
  limit = MAX_MATCHES,
): { scope: MatchScope; picked: MatchCandidate[] } {
  const state = normState(requestState);
  const order = (a: MatchCandidate, b: MatchCandidate) =>
    Number(b.declaredCategory) - Number(a.declaredCategory) ||
    a.id.localeCompare(b.id);

  if (state) {
    const inState = candidates.filter((c) => coversState(c, state));
    if (inState.length > 0) {
      return { scope: 'STATE', picked: inState.sort(order).slice(0, limit) };
    }
  }
  const national = candidates.filter(
    (c) => c.serviceStates.map(normState).filter(Boolean).length === 0,
  );
  if (national.length > 0) {
    return { scope: 'NATIONAL', picked: national.sort(order).slice(0, limit) };
  }
  return { scope: 'NONE', picked: [] };
}

const DETAIL_KEY_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

/** Keep vertical-specific intake details small, flat and primitive. */
export function sanitizeDetails(
  raw: unknown,
): Record<string, string | number | boolean> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= 20) break;
    if (!DETAIL_KEY_RE.test(k)) continue;
    if (typeof v === 'string') {
      const t = v.trim().slice(0, 500);
      if (t) out[k] = t;
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = v;
    } else if (typeof v === 'boolean') {
      out[k] = v;
    }
  }
  return Object.keys(out).length ? out : null;
}

export function formatDetailsForMessage(
  details: Record<string, string | number | boolean> | null,
): string {
  if (!details) return '';
  return Object.entries(details)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${v}`)
    .join('\n');
}
