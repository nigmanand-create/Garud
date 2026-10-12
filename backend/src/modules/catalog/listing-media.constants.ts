export const LISTING_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

export const MAX_LISTING_IMAGE_BYTES = 5 * 1024 * 1024;

/** Browser-facing path prefix (proxied by Next.js in dev). */
export const LISTING_MEDIA_URL_PREFIX = '/platform-api/v1/media/listings';
