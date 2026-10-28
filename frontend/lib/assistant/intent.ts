import type { CatalogCategory, ListingType } from '@/lib/api/types';
import { COMMON_APPLICATIONS } from '@/lib/platform/catalog-listing-form';
import { ASSISTANT_QUICK_REPLIES, type ParsedIntent } from './types';

const PUNCT_RE = /[^\p{L}\p{N}\s₹]/gu;

const CATEGORY_RULES: {
  category: CatalogCategory;
  listingType: ListingType;
  phrases: string[];
  weight: number;
}[] = [
  {
    category: 'AGRICULTURE_DRONE',
    listingType: 'PRODUCT',
    phrases: [
      'spray',
      'spraying',
      'agri',
      'agriculture',
      'crop',
      'pesticide',
      'farming',
      'farmer',
    ],
    weight: 1,
  },
  {
    category: 'SURVEY_MAPPING_DRONE',
    listingType: 'PRODUCT',
    phrases: [
      'survey',
      'mapping',
      'photogrammetry',
      'ppk',
      'rtk',
      'lidar',
      'construction site',
      'topographic',
    ],
    weight: 1,
  },
  {
    category: 'INDUSTRIAL_ENTERPRISE_DRONE',
    listingType: 'PRODUCT',
    phrases: [
      'inspection',
      'industrial',
      'thermal',
      'enterprise',
      'heavy lift',
      'infrastructure',
    ],
    weight: 1,
  },
  {
    category: 'CAMERA_DRONE',
    listingType: 'PRODUCT',
    phrases: ['cinema', 'photo', '4k', 'film', 'filming', 'camera drone'],
    weight: 1,
  },
  {
    category: 'ACCESSORY',
    listingType: 'PRODUCT',
    phrases: ['battery', 'propeller', 'accessory', 'case', 'charger'],
    weight: 1,
  },
  {
    category: 'PAYLOAD',
    listingType: 'PRODUCT',
    phrases: ['payload', 'multispectral', 'ndvi', 'sensor', 'gimbal'],
    weight: 1,
  },
  {
    category: 'TRAINING',
    listingType: 'SERVICE',
    phrases: [
      'training',
      'course',
      'dgca course',
      'pilot license',
      'pilot licence',
      'certification program',
    ],
    weight: 1,
  },
  {
    category: 'REPAIR_MAINTENANCE',
    listingType: 'SERVICE',
    phrases: ['amc', 'repair', 'maintenance', 'service center'],
    weight: 1,
  },
  {
    category: 'CONSULTANCY',
    listingType: 'SERVICE',
    phrases: ['consultancy', 'compliance', 'bvlos', 'sop', 'consulting'],
    weight: 1,
  },
];

const APPLICATION_PHRASES: { tag: string; phrases: string[] }[] = [
  { tag: 'Agriculture Spraying', phrases: ['spray', 'spraying', 'pesticide', 'agri'] },
  {
    tag: 'Topographic Survey & Mapping',
    phrases: ['survey', 'mapping', 'ppk', 'rtk', 'photogrammetry'],
  },
  {
    tag: 'Industrial & Infrastructure Inspection',
    phrases: ['inspection', 'industrial', 'infrastructure'],
  },
  { tag: 'Security & Surveillance', phrases: ['surveillance', 'security'] },
  {
    tag: 'Mining & Volumetric Estimation',
    phrases: ['mining', 'volumetric'],
  },
];

type QuickIntentPartial = Partial<
  Pick<
    ParsedIntent,
    | 'primaryCategory'
    | 'listingType'
    | 'budgetMaxInr'
    | 'requiresDgcaHint'
    | 'categoryConfidence'
  >
>;

const QUICK_REPLY_DEFINITIONS: Record<string, QuickIntentPartial> = {
  'agriculture spraying': {
    primaryCategory: 'AGRICULTURE_DRONE',
    listingType: 'PRODUCT',
    categoryConfidence: 'high',
  },
  'survey & mapping': {
    primaryCategory: 'SURVEY_MAPPING_DRONE',
    listingType: 'PRODUCT',
    categoryConfidence: 'high',
  },
  'budget under ₹5l': {
    budgetMaxInr: 500_000,
    categoryConfidence: 'low',
  },
  'dgca compliant': {
    requiresDgcaHint: true,
    categoryConfidence: 'low',
  },
  'training / dgca course': {
    primaryCategory: 'TRAINING',
    listingType: 'SERVICE',
    categoryConfidence: 'high',
  },
};

function expandIndianNumbers(text: string): string {
  let t = text.toLowerCase();
  t = t.replace(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs|lacs)\b/g, (_, n) =>
    String(parseFloat(n) * 100_000),
  );
  t = t.replace(/(\d+(?:\.\d+)?)\s*(?:crore|cr)\b/g, (_, n) =>
    String(parseFloat(n) * 10_000_000),
  );
  t = t.replace(/(\d+(?:\.\d+)?)\s*k\b/g, (_, n) =>
    String(parseFloat(n) * 1_000),
  );
  return t;
}

export function normalizeMessage(raw: string): string {
  return expandIndianNumbers(raw.toLowerCase().replace(PUNCT_RE, ' ').replace(/\s+/g, ' ').trim());
}

export function tokenize(normalized: string): string[] {
  return normalized.split(/\s+/).filter((t) => t.length > 1);
}

function lookupQuickReply(message: string): QuickIntentPartial | undefined {
  const key = normalizeMessage(message);
  const label = ASSISTANT_QUICK_REPLIES.find((q) => normalizeMessage(q) === key);
  if (!label) return undefined;
  return QUICK_REPLY_DEFINITIONS[label.toLowerCase()];
}

function extractBudget(normalized: string): {
  budgetMaxInr: number | null;
  budgetMinInr: number | null;
} {
  let budgetMaxInr: number | null = null;
  let budgetMinInr: number | null = null;

  const underMatch = normalized.match(
    /(?:under|below|max|upto|up to|cheapest|within)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/,
  );
  if (underMatch) {
    budgetMaxInr = parseInt(underMatch[1].replace(/,/g, ''), 10);
  }

  const lakhUnder = normalized.match(/under\s+(\d+(?:\.\d+)?)\s*(?:lakh|lac)/);
  if (lakhUnder) {
    budgetMaxInr = Math.round(parseFloat(lakhUnder[1]) * 100_000);
  }

  const explicitInr = normalized.match(/(?:₹|rs\.?|inr)\s*(\d[\d,]*)/);
  if (!budgetMaxInr && explicitInr && /under|below|budget|cheapest/.test(normalized)) {
    budgetMaxInr = parseInt(explicitInr[1].replace(/,/g, ''), 10);
  }

  const bareLakh =
    normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:lakh|lac)\b/) &&
    /budget|under|below|₹|rs/.test(normalized);
  if (!budgetMaxInr && bareLakh) {
    const m = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:lakh|lac)\b/);
    if (m) budgetMaxInr = Math.round(parseFloat(m[1]) * 100_000);
  }

  const overMatch = normalized.match(
    /(?:above|over|min|minimum|from)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/,
  );
  if (overMatch) {
    budgetMinInr = parseInt(overMatch[1].replace(/,/g, ''), 10);
  }

  return { budgetMaxInr, budgetMinInr };
}

function scoreCategories(
  normalized: string,
  tokens: string[],
): { scores: Map<CatalogCategory, number>; listingTypeVotes: Map<ListingType, number> } {
  const scores = new Map<CatalogCategory, number>();
  const listingTypeVotes = new Map<ListingType, number>();

  for (const rule of CATEGORY_RULES) {
    let hits = 0;
    for (const phrase of rule.phrases) {
      if (phrase.includes(' ')) {
        if (normalized.includes(phrase)) hits += 2;
      } else if (tokens.includes(phrase)) {
        hits += 1;
      }
    }
    if (hits > 0) {
      scores.set(rule.category, (scores.get(rule.category) ?? 0) + hits * rule.weight);
      listingTypeVotes.set(
        rule.listingType,
        (listingTypeVotes.get(rule.listingType) ?? 0) + hits,
      );
    }
  }

  if (/drone|uav|platform/.test(normalized) && !scores.has('TRAINING')) {
    listingTypeVotes.set('PRODUCT', (listingTypeVotes.get('PRODUCT') ?? 0) + 2);
  }
  if (/course|training|service/.test(normalized)) {
    listingTypeVotes.set('SERVICE', (listingTypeVotes.get('SERVICE') ?? 0) + 2);
  }

  return { scores, listingTypeVotes };
}

function resolveListingType(
  votes: Map<ListingType, number>,
  primaryCategory: CatalogCategory | null,
): ListingType | null {
  if (primaryCategory) {
    const rule = CATEGORY_RULES.find((r) => r.category === primaryCategory);
    if (rule) return rule.listingType;
  }
  const product = votes.get('PRODUCT') ?? 0;
  const service = votes.get('SERVICE') ?? 0;
  if (product === 0 && service === 0) return null;
  return product >= service ? 'PRODUCT' : 'SERVICE';
}

function matchApplicationTags(normalized: string, tokens: string[]): string[] {
  const tags = new Set<string>();
  for (const { tag, phrases } of APPLICATION_PHRASES) {
    if (!COMMON_APPLICATIONS.includes(tag)) continue;
    for (const phrase of phrases) {
      if (phrase.includes(' ') ? normalized.includes(phrase) : tokens.includes(phrase)) {
        tags.add(tag);
      }
    }
  }
  return [...tags];
}

export function parseIntent(message: string, context?: { lastQuickReply?: string }): ParsedIntent {
  const combined = [context?.lastQuickReply, message].filter(Boolean).join(' ');
  const normalized = normalizeMessage(combined);
  const tokens = tokenize(normalized);

  const quickOverride = lookupQuickReply(message);
  const fromQuickReply = Boolean(quickOverride);

  const { budgetMaxInr, budgetMinInr } = extractBudget(normalized);
  const requiresDgcaHint =
    /\bdgca\b|type cert|type certificate|drone rules|compliant/.test(normalized);

  let payloadKgMin: number | null = null;
  const payloadMatch = normalized.match(/(\d+(?:\.\d+)?)\s*kg/);
  if (payloadMatch && /payload|lift|carry|kg/.test(normalized)) {
    payloadKgMin = parseFloat(payloadMatch[1]);
  }

  let enduranceMinutesMin: number | null = null;
  const enduranceMatch = normalized.match(/(\d+)\s*min/);
  if (enduranceMatch && /endurance|flight time|minutes/.test(normalized)) {
    enduranceMinutesMin = parseInt(enduranceMatch[1], 10);
  }

  const { scores, listingTypeVotes } = scoreCategories(normalized, tokens);
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  let primaryCategory = ranked[0]?.[0] ?? null;
  let secondaryCategories = ranked.slice(1, 3).map(([c]) => c);
  let categoryConfidence: ParsedIntent['categoryConfidence'] = 'low';

  if (ranked[0]) {
    const top = ranked[0][1];
    const second = ranked[1]?.[1] ?? 0;
    if (top >= 3 && top >= second * 1.5) categoryConfidence = 'high';
    else if (top >= 2) categoryConfidence = 'medium';
  }

  if (quickOverride?.primaryCategory) {
    primaryCategory = quickOverride.primaryCategory;
    categoryConfidence = quickOverride.categoryConfidence ?? 'high';
    secondaryCategories = secondaryCategories.filter((c) => c !== primaryCategory);
  }

  const listingType =
    quickOverride?.listingType ?? resolveListingType(listingTypeVotes, primaryCategory);

  const agriAndTraining =
    scores.get('AGRICULTURE_DRONE') &&
    (scores.get('TRAINING') ?? 0) > 0 &&
    !fromQuickReply;
  if (agriAndTraining && primaryCategory === 'TRAINING') {
    primaryCategory = 'AGRICULTURE_DRONE';
    categoryConfidence = 'medium';
  }

  const stopWords = new Set([
    'need',
    'want',
    'looking',
    'for',
    'drone',
    'drones',
    'uav',
    'the',
    'and',
    'with',
    'under',
    'below',
    'india',
    'punjab',
  ]);
  const searchKeywords = tokens.filter((t) => !stopWords.has(t) && t.length > 2);

  return {
    rawMessage: message,
    tokens,
    primaryCategory: quickOverride?.primaryCategory ?? primaryCategory,
    secondaryCategories,
    categoryConfidence: quickOverride?.categoryConfidence ?? categoryConfidence,
    listingType,
    budgetMaxInr: quickOverride?.budgetMaxInr ?? budgetMaxInr,
    budgetMinInr,
    requiresDgcaHint: quickOverride?.requiresDgcaHint ?? requiresDgcaHint,
    payloadKgMin,
    enduranceMinutesMin,
    applicationTags: matchApplicationTags(normalized, tokens),
    searchKeywords,
    fromQuickReply,
  };
}

export function intentNeedsClarification(intent: ParsedIntent): boolean {
  if (intent.fromQuickReply && intent.primaryCategory) return false;
  if (intent.budgetMaxInr && !intent.primaryCategory) return false;
  if (intent.requiresDgcaHint && !intent.primaryCategory) return false;
  return intent.categoryConfidence === 'low' && !intent.primaryCategory;
}
