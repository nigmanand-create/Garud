export function isOpportunityExpired(
  closingDate: Date | null | undefined,
  now = new Date(),
): boolean {
  return Boolean(closingDate && closingDate.getTime() < now.getTime());
}
