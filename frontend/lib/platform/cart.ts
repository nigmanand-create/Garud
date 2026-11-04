import { ApiError } from '../api/types';

/**
 * Carts hold items from a single seller (one order = one vendor invoice, shipment and
 * payment). Multi-seller sourcing goes through RFQ. See docs/PAYMENTS_RUNBOOK.md §7.
 */
export const SINGLE_SELLER_POLICY =
  'Each order is placed with one seller. To buy from several sellers, check out one cart first, or raise an RFQ to source from multiple vendors at once.';

/** The backend answers 409 when the listing belongs to a different seller than the cart. */
export function isSingleSellerConflict(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}
