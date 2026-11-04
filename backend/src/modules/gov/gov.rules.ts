export function isOpportunityExpired(
  closingDate: Date | null | undefined,
  now = new Date(),
): boolean {
  return Boolean(closingDate && closingDate.getTime() < now.getTime());
}

/** Tender bids stay sealed until the closing datetime passes (MVP). */
export function areTenderBidsUnsealed(
  closingDate: Date | null | undefined,
  now = new Date(),
): boolean {
  return Boolean(closingDate && closingDate.getTime() <= now.getTime());
}
