import { apiRequest } from './client';
import type { CartResponse } from './types';

export function fetchCart() {
  return apiRequest<CartResponse>('/buyer/cart', { auth: true });
}

export function addToCart(listingId: string, quantity = 1) {
  return apiRequest<CartResponse>('/buyer/cart/items', {
    method: 'POST',
    auth: true,
    body: { listingId, quantity },
  });
}

export function updateCartItem(itemId: string, quantity: number) {
  return apiRequest<CartResponse>(`/buyer/cart/items/${itemId}`, {
    method: 'PATCH',
    auth: true,
    body: { quantity },
  });
}

export function removeCartItem(itemId: string) {
  return apiRequest<CartResponse>(`/buyer/cart/items/${itemId}`, {
    method: 'DELETE',
    auth: true,
  });
}

export function clearCart() {
  return apiRequest<CartResponse>('/buyer/cart', {
    method: 'DELETE',
    auth: true,
  });
}
