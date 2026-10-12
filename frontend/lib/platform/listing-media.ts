import { getApiBase } from '@/lib/api/client';

/** Resolve stored listing image URL for <img src> (upload paths or external HTTPS). */
export function resolveListingImageUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/platform-api/')) {
    return trimmed;
  }
  if (trimmed.startsWith('/api/v1/')) {
    const base = getApiBase();
    const apiRoot = base.replace(/\/v1\/?$/, '');
    return `${apiRoot}${trimmed.replace(/^\/api\/v1/, '')}`;
  }
  return trimmed;
}

/** Parse partner-entered gallery URLs (newline or comma separated). */
export function parseGalleryImageUrls(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatGalleryImageUrls(urls: string[] | undefined | null): string {
  return (urls ?? []).join('\n');
}
