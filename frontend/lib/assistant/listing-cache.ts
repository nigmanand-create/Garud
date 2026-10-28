import { apiRequest } from '@/lib/api/client';
import type { AssistantListing } from './types';

const TTL_MS = 10 * 60 * 1000;

let cached: AssistantListing[] | null = null;
let fetchedAt = 0;
let inflight: Promise<AssistantListing[]> | null = null;

export function clearAssistantListingCache(): void {
  cached = null;
  fetchedAt = 0;
  inflight = null;
}

export async function fetchAssistantListings(
  options?: { force?: boolean },
): Promise<AssistantListing[]> {
  const now = Date.now();
  if (!options?.force && cached && now - fetchedAt < TTL_MS) {
    return cached;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const params = new URLSearchParams();
      params.set('take', '50');
      const rows = await apiRequest<AssistantListing[]>(
        `/marketplace/listings?${params}`,
      );
      cached = rows;
      fetchedAt = Date.now();
      return rows;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
