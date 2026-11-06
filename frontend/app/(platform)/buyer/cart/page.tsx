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
import { formatListingMinOrderLabel, formatPrice } from '@/lib/platform/labels';
import {
  effectiveCartMinQuantity,
  SINGLE_SELLER_POLICY,
} from '@/lib/platform/cart';
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
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      let data = await fetchCart();
      const fixes: { id: string; moq: number }[] = [];
      for (const item of data.items) {
        const minQty = effectiveCartMinQuantity(item.listing.minOrderQuantity);
        if (item.quantity < minQty) {
          fixes.push({ id: item.id, moq: minQty });
        }
      }
      if (fixes.length > 0) {
        for (const fix of fixes) {
          data = await updateCartItem(fix.id, fix.moq);
        }
        const uniqueMoqs = [...new Set(fixes.map((f) => f.moq))];
        setNotice(
          uniqueMoqs.length === 1
            ? `Quantity adjusted to minimum order (${uniqueMoqs[0]}).`
            : 'Quantities adjusted to meet minimum order requirements.',
        );
      }
      setCart(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load cart');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onQty(itemId: string, quantity: number, minQty: number) {
    const nextQty = Math.max(minQty, quantity);
    if (nextQty < 1) return;
    setBusy(itemId);
    setError(null);
    try {
      const next = await updateCartItem(itemId, nextQty);
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
        <div className="platform-skeleton platform-skeleton-line platform-skeleton-line--short platform-skeleton-line--title" />
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
      {notice && (
        <div className="platform-flash-success" role="status">
          <div className="platform-flash-success__content">
            <span aria-hidden>✓</span>
            <span className="platform-font-semibold">{notice}</span>
          </div>
          <button
            type="button"
            className="platform-flash-dismiss"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      {error && <div className="platform-card platform-error">{error}</div>}
      {!empty && (
        <p className="platform-muted platform-text-sm" role="note">
          {SINGLE_SELLER_POLICY}{' '}
          <Link href="/buyer/rfqs/new">Raise an RFQ</Link>
        </p>
      )}
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
              {cart.items.map((item) => {
                const minQty = effectiveCartMinQuantity(
                  item.listing.minOrderQuantity,
                );
                const minOrderLabel = formatListingMinOrderLabel(
                  item.listing.minOrderQuantity,
                );
                return (
                <li key={item.id} className="platform-cart-line">
                  <div>
                    <Link href={`/marketplace/listings/${item.listing.id}`}>
                      <strong>{item.listing.name}</strong>
                    </Link>
                    {item.listing.sku && (
                      <p className="platform-muted platform-text-muted-sm platform-mt-sm">
                        SKU: {item.listing.sku}
                      </p>
                    )}
                    {minOrderLabel && (
                      <p className="platform-muted platform-text-muted-sm platform-mt-sm">
                        {minOrderLabel}
                      </p>
                    )}
                  </div>
                  <div className="platform-cart-line-qty">
                    <button
                      type="button"
                      className="platform-qty-btn"
                      disabled={busy === item.id || item.quantity <= minQty}
                      onClick={() =>
                        onQty(item.id, item.quantity - 1, minQty)
                      }
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      className="platform-qty-btn"
                      disabled={busy === item.id}
                      onClick={() =>
                        onQty(item.id, item.quantity + 1, minQty)
                      }
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <div className="platform-cart-line-total">
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
              );
              })}
            </ul>
          </div>
          <aside>
            <div className="platform-card">
              <p className="platform-order-total-label">Subtotal</p>
              <p className="platform-order-total-amount">
                {formatPrice(false, cart.subtotalInr)}
              </p>
              <p className="platform-muted platform-text-muted-sm">
                Pay offline after order placement (Phase 2). GST and shipping calculated at confirmation.
              </p>
              <Link href="/buyer/checkout" className="platform-btn platform-btn-cta platform-btn-full platform-mt-md">
                Proceed to checkout
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
