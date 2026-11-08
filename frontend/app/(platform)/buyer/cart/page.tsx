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
import { effectiveCartMinQuantity } from '@/lib/platform/cart';
import { resolveListingImageUrl } from '@/lib/platform/listing-media';
import type { CartResponse, SellerCart } from '@/lib/api/types';
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
      for (const sc of data.sellerCarts) {
        for (const item of sc.items) {
          const minQty = effectiveCartMinQuantity(item.listing.minOrderQuantity);
          if (item.quantity < minQty) {
            fixes.push({ id: item.id, moq: minQty });
          }
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

  const empty = cart.sellerCarts.length === 0;
  const sellerLabel =
    cart.sellerCarts.length === 0
      ? 'Review items before checkout'
      : cart.sellerCarts.length === 1
        ? `Items from ${cart.sellerCarts[0].partnerOrganization.companyName}`
        : `${cart.sellerCarts.length} sellers · ${cart.itemCount} units`;

  return (
    <>
      <PlatformPageHeader
        title="Cart"
        subtitle={sellerLabel}
        actions={
          !empty ? (
            <button
              type="button"
              className="platform-btn platform-btn-secondary"
              disabled={busy === 'clear'}
              onClick={() => onClear()}
            >
              Clear all carts
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
          Lines are grouped by seller. Use <strong>Checkout this seller</strong> for that seller only (one
          order per checkout). To compare vendors or custom terms,{' '}
          <Link href="/buyer/rfqs/new">raise an RFQ</Link>.
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
            {cart.sellerCarts.map((sellerCart) => (
              <SellerCartSection
                key={sellerCart.id}
                sellerCart={sellerCart}
                busy={busy}
                onQty={onQty}
                onRemove={onRemove}
              />
            ))}
          </div>
          <aside>
            <div className="platform-card">
              <p className="platform-order-total-label">Subtotal (all sellers)</p>
              <p className="platform-order-total-amount">
                {formatPrice(false, cart.subtotalInr)}
              </p>
              <p className="platform-muted platform-text-muted-sm">
                Line totals are list prices × quantity. Shipping is confirmed with the seller at fulfillment.
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function SellerCartSection({
  sellerCart,
  busy,
  onQty,
  onRemove,
}: {
  sellerCart: SellerCart;
  busy: string | null;
  onQty: (itemId: string, quantity: number, minQty: number) => void;
  onRemove: (itemId: string) => void;
}) {
  const { partnerOrganization } = sellerCart;
  return (
    <section
      className="platform-cart-seller-block platform-mt-md"
      style={{ borderBottom: '1px solid var(--platform-border, #e2e8f0)', paddingBottom: '1.25rem' }}
      aria-labelledby={`seller-heading-${partnerOrganization.id}`}
    >
      <h2
        id={`seller-heading-${partnerOrganization.id}`}
        className="platform-section-heading platform-mb-md"
      >
        {partnerOrganization.companyName}
      </h2>
      <ul className="platform-cart-lines">
        {sellerCart.items.map((item) => {
          const minQty = effectiveCartMinQuantity(item.listing.minOrderQuantity);
          const minOrderLabel = formatListingMinOrderLabel(item.listing.minOrderQuantity);
          return (
            <li key={item.id} className="platform-cart-line">
              <div className="platform-cart-line-main">
                {(() => {
                  const thumb = resolveListingImageUrl(item.listing.primaryImageUrl);
                  return thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="platform-cart-line-thumb"
                    />
                  ) : (
                    <div className="platform-cart-line-thumb platform-cart-line-thumb--placeholder" aria-hidden>
                      ✦
                    </div>
                  );
                })()}
                <div className="platform-cart-line-details">
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
              </div>
              <div className="platform-cart-line-qty">
                <button
                  type="button"
                  className="platform-qty-btn"
                  disabled={busy === item.id || item.quantity <= minQty}
                  onClick={() => onQty(item.id, item.quantity - 1, minQty)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  className="platform-qty-btn"
                  disabled={busy === item.id}
                  onClick={() => onQty(item.id, item.quantity + 1, minQty)}
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
                  Remove from cart
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="platform-mt-md platform-cart-seller-actions">
        <p className="platform-muted platform-text-sm platform-mb-sm">
          Seller subtotal: <strong>{formatPrice(false, sellerCart.subtotalInr)}</strong>
        </p>
        <Link
          href={`/buyer/checkout?vendor=${encodeURIComponent(partnerOrganization.id)}`}
          className="platform-btn platform-btn-cta"
        >
          Checkout this seller
        </Link>
      </div>
    </section>
  );
}
