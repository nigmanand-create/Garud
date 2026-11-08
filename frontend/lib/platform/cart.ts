import { ApiError } from '../api/types';

/**
 * Each checkout creates one order per seller. The cart can hold lines from several
 * sellers; checkout is per seller (see cart UI / checkout `vendor` query).
 * Multi-seller *sourcing* at quote level still goes through RFQ. See docs/PAYMENTS_RUNBOOK.md §7.
 */
export const MULTI_SELLER_CHECKOUT_POLICY =
  'Your cart groups items by seller. Use Checkout on each seller’s block to place one order per seller. To compare quotes across vendors, raise an RFQ.';

/** @deprecated Use MULTI_SELLER_CHECKOUT_POLICY — kept for older imports/tests. */
export const SINGLE_SELLER_POLICY = MULTI_SELLER_CHECKOUT_POLICY;

/** The backend historically returned 409 when mixing sellers in a single cart row (removed). */
export function isSingleSellerConflict(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

/** Lowest quantity allowed in the cart for a listing (MOQ when above 1, else 1). */
export function effectiveCartMinQuantity(
  minOrderQuantity?: number | null,
): number {
  return minOrderQuantity != null && minOrderQuantity > 1
    ? minOrderQuantity
    : 1;
}
