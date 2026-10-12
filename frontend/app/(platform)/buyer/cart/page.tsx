'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  clearCart,
  fetchCart,
  removeCartItem,
  updateCartItem,
} from '@/lib/api/cart';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { EmptyState } from '@/components/platform/EmptyState';
import { formatPrice } from '@/lib/platform/labels';
import type { CartResponse } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

export default function BuyerCartPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']}>
      <BuyerCartInner />
    </RequireAuth>
  );
}

function BuyerCartInner() {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchCart()
      .then(setCart)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load cart'),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onQty(itemId: string, quantity: number) {
    if (quantity < 1) return;
    setBusy(itemId);
    setError(null);
    try {
      const next = await updateCartItem(itemId, quantity);
      setCart(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  }

  async function onRemove(itemId: string) {
    setBusy(itemId);
    setError(null);
    try {
      const next = await removeCartItem(itemId);
      setCart(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Remove failed');
    } finally {
      setBusy(null);
    }
  }

  async function onClear() {
    setBusy('clear');
    setError(null);
    try {
      const next = await clearCart();
      setCart(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Clear failed');
    } finally {
      setBusy(null);
    }
  }

  if (!cart) {
    return (
      <div className="platform-grid" aria-busy="true">
        <div className="platform-skeleton" style={{ height: 28, width: '40%' }} />
      </div>
    );
  }

  const empty = cart.items.length === 0;

  return (
    <>
      <PlatformPageHeader
        title="Cart"
        subtitle={
          cart.partnerOrganization
            ? `Items from ${cart.partnerOrganization.companyName}`
            : 'Review items before checkout'
        }
        actions={
          !empty ? (
            <button
              type="button"
              className="platform-btn platform-btn-secondary"
              disabled={busy === 'clear'}
              onClick={() => onClear()}
            >
              Clear cart
            </button>
          ) : undefined
        }
      />
      {error && <div className="platform-card platform-error">{error}</div>}
      {empty ? (
        <EmptyState
          title="Your cart is empty"
          description="Browse the marketplace and add fixed-price listings to your cart."
          primaryAction={{ label: 'Browse marketplace', href: '/marketplace' }}
        />
      ) : (
        <div className="platform-detail-layout">
          <div className="platform-card">
            <ul className="platform-cart-lines">
              {cart.items.map((item) => (
                <li key={item.id} className="platform-cart-line">
                  <div>
                    <Link href={`/marketplace/listings/${item.listing.id}`}>
                      <strong>{item.listing.name}</strong>
                    </Link>
                    {item.listing.sku && (
                      <p className="platform-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>
                        SKU: {item.listing.sku}
                      </p>
                    )}
                  </div>
                  <div className="platform-cart-line-qty">
                    <button
                      type="button"
                      className="platform-qty-btn"
                      disabled={busy === item.id || item.quantity <= 1}
                      onClick={() => onQty(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      className="platform-qty-btn"
                      disabled={busy === item.id}
                      onClick={() => onQty(item.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '6rem' }}>
                    <div>{formatPrice(false, item.lineTotalInr)}</div>
                    <button
                      type="button"
                      className="platform-link-btn"
                      disabled={busy === item.id}
                      onClick={() => onRemove(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <aside>
            <div className="platform-card">
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}>Subtotal</p>
              <p style={{ margin: '0 0 1rem', fontSize: '1.5rem', fontWeight: 700 }}>
                {formatPrice(false, cart.subtotalInr)}
              </p>
              <p className="platform-muted" style={{ margin: '0 0 1rem', fontSize: '0.8125rem' }}>
                Pay offline after order placement (Phase 2). GST and shipping calculated at confirmation.
              </p>
              <Link href="/buyer/checkout" className="platform-btn platform-btn-cta platform-btn-full">
                Proceed to checkout
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
