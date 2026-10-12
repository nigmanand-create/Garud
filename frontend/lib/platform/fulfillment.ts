import type { FulfillmentStatus } from '@/lib/api/types';

const FULFILLMENT_ORDER: FulfillmentStatus[] = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'FULFILLED',
];

export function fulfillmentTimelineText(status: FulfillmentStatus): string {
  switch (status) {
    case 'PENDING':
      return 'The seller has not started fulfillment yet.';
    case 'PROCESSING':
      return 'The seller is preparing your order.';
    case 'SHIPPED':
      return 'Your order has been shipped.';
    case 'FULFILLED':
      return 'This order has been marked fulfilled.';
    default:
      return '';
  }
}

export function partnerFulfillmentOptions(
  current: FulfillmentStatus,
): FulfillmentStatus[] {
  return FULFILLMENT_ORDER.filter((s) => s !== current);
}
