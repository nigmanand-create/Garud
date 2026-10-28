import type { AssistantListing } from './types';

export function listingSearchCorpus(listing: AssistantListing): string {
  const parts = [
    listing.name,
    listing.brand,
    listing.sku,
    listing.description,
    listing.technicalSpecs,
    ...(listing.applications ?? []),
  ];
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function listingHasDgcaMention(listing: AssistantListing): boolean {
  const corpus = listingSearchCorpus(listing);
  return (
    corpus.includes('dgca') ||
    corpus.includes('type cert') ||
    corpus.includes('type certificate') ||
    corpus.includes('drone rules')
  );
}

/** Best-effort parse of payload kg from listing text (not structured in DB). */
export function parsePayloadKgFromListing(listing: AssistantListing): number | null {
  const text = listingSearchCorpus(listing);
  const tankMatch = text.match(/(\d+(?:\.\d+)?)\s*l\b/);
  if (tankMatch) {
    const liters = parseFloat(tankMatch[1]);
    if (!Number.isNaN(liters)) return Math.round(liters * 0.9 * 10) / 10;
  }
  const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*kg/);
  if (kgMatch) {
    const kg = parseFloat(kgMatch[1]);
    if (!Number.isNaN(kg)) return kg;
  }
  return null;
}

export function parseEnduranceMinutesFromListing(
  listing: AssistantListing,
): number | null {
  const text = listingSearchCorpus(listing);
  const minMatch = text.match(/(\d+)\s*min/);
  if (minMatch) {
    const m = parseInt(minMatch[1], 10);
    if (!Number.isNaN(m)) return m;
  }
  const enduranceMatch = text.match(/endurance[:\s]+(\d+)/);
  if (enduranceMatch) {
    const m = parseInt(enduranceMatch[1], 10);
    if (!Number.isNaN(m)) return m;
  }
  return null;
}

export function parsePriceInr(listing: AssistantListing): number | null {
  if (listing.priceOnRequest || !listing.priceInr) return null;
  const n = Number(listing.priceInr);
  return Number.isFinite(n) && n > 0 ? n : null;
}
