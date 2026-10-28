import type { CatalogCategory } from '@/lib/api/types';
import { CATEGORY_LABELS } from '@/lib/platform/labels';
import {
  listingHasDgcaMention,
  listingSearchCorpus,
  parseEnduranceMinutesFromListing,
  parsePayloadKgFromListing,
  parsePriceInr,
} from './listing-corpus';
import type { AssistantListing, ParsedIntent, ScoredListing } from './types';

const ADJACENT_CATEGORIES: Partial<Record<CatalogCategory, CatalogCategory[]>> = {
  PAYLOAD: ['SURVEY_MAPPING_DRONE', 'INDUSTRIAL_ENTERPRISE_DRONE'],
  SURVEY_MAPPING_DRONE: ['PAYLOAD'],
};

export function filterListingsForIntent(
  listings: AssistantListing[],
  intent: ParsedIntent,
): AssistantListing[] {
  let candidates = [...listings];

  if (intent.listingType) {
    candidates = candidates.filter((l) => l.listingType === intent.listingType);
  }

  if (intent.primaryCategory && intent.categoryConfidence !== 'low') {
    const allowed = new Set<CatalogCategory>([intent.primaryCategory]);
    for (const adj of ADJACENT_CATEGORIES[intent.primaryCategory] ?? []) {
      allowed.add(adj);
    }
    if (intent.fromQuickReply) {
      candidates = candidates.filter((l) => l.category === intent.primaryCategory);
    } else if (intent.categoryConfidence === 'high') {
      candidates = candidates.filter((l) => allowed.has(l.category));
    } else {
      candidates = candidates.filter(
        (l) => l.category === intent.primaryCategory || allowed.has(l.category),
      );
    }
  }

  if (intent.budgetMaxInr != null) {
    const max = intent.budgetMaxInr * 1.1;
    const fixedMatches = candidates.filter((l) => {
      const price = parsePriceInr(l);
      if (price == null) return false;
      return price <= max;
    });
    if (fixedMatches.length > 0) {
      candidates = fixedMatches;
    }
  }

  return candidates;
}

function keywordScore(corpus: string, field: string, tokens: string[], perHit: number, cap: number): number {
  const fieldLower = field.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (token.length < 3) continue;
    if (fieldLower.includes(token)) {
      score += perHit;
    }
  }
  return Math.min(score, cap);
}

function tieBreakFromUpdatedAt(updatedAt?: string): number {
  if (!updatedAt) return 0;
  const ts = Date.parse(updatedAt);
  if (Number.isNaN(ts)) return 0;
  const days = (Date.now() - ts) / (86400 * 1000);
  if (days <= 7) return 3;
  if (days <= 30) return 2;
  if (days <= 90) return 1;
  return 0;
}

export function scoreListing(listing: AssistantListing, intent: ParsedIntent): ScoredListing {
  const rationaleLines: string[] = [];
  let score = 0;
  const keywords = intent.searchKeywords.length ? intent.searchKeywords : intent.tokens;
  const corpus = listingSearchCorpus(listing);

  if (intent.primaryCategory && listing.category === intent.primaryCategory) {
    score += 35;
    rationaleLines.push(`Matched **${CATEGORY_LABELS[listing.category]}** category.`);
  } else if (intent.secondaryCategories.includes(listing.category)) {
    score += 15;
  }

  if (intent.listingType && listing.listingType === intent.listingType) {
    score += 10;
  }

  score += keywordScore(corpus, listing.name, keywords, 8, 24);
  score += keywordScore(corpus, listing.description ?? '', keywords, 4, 16);
  score += keywordScore(corpus, listing.technicalSpecs ?? '', keywords, 6, 18);

  for (const tag of intent.applicationTags) {
    if (listing.applications?.includes(tag)) {
      score += 12;
      rationaleLines.push(`Application tag *${tag}* matches your use case.`);
    }
  }

  const price = parsePriceInr(listing);
  if (intent.budgetMaxInr != null) {
    if (price != null && price <= intent.budgetMaxInr) {
      score += 15;
      rationaleLines.push(
        `Within your **₹${intent.budgetMaxInr.toLocaleString('en-IN')}** budget (listed price).`,
      );
    } else if (price != null && price > intent.budgetMaxInr) {
      score -= 25;
    } else if (listing.priceOnRequest) {
      score -= 5;
      rationaleLines.push('**Price on request** — use RFQ for fleet pricing.');
    }
  }

  if (intent.requiresDgcaHint) {
    if (listingHasDgcaMention(listing)) {
      score += 20;
      rationaleLines.push('Listing text mentions **DGCA / compliance** (verify details on the PDP).');
    } else {
      score -= 10;
    }
  }

  if (intent.payloadKgMin != null) {
    const parsed = parsePayloadKgFromListing(listing);
    if (parsed != null && parsed >= intent.payloadKgMin) {
      score += 10;
    }
  }

  if (intent.enduranceMinutesMin != null) {
    const parsed = parseEnduranceMinutesFromListing(listing);
    if (parsed != null && parsed >= intent.enduranceMinutesMin) {
      score += 10;
    }
  }

  if (intent.budgetMinInr != null && price != null && price < intent.budgetMinInr) {
    score -= 5;
  }

  score += tieBreakFromUpdatedAt(listing.updatedAt);

  return { listing, score, rationaleLines: [...new Set(rationaleLines)] };
}

export function rankListings(
  listings: AssistantListing[],
  intent: ParsedIntent,
  limit = 5,
): ScoredListing[] {
  const filtered = filterListingsForIntent(listings, intent);
  const pool = filtered.length > 0 ? filtered : listings;
  return pool
    .map((l) => scoreListing(l, intent))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
