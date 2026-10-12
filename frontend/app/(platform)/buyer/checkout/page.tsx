'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api/client';
import { fetchCart } from '@/lib/api/cart';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { formatPrice } from '@/lib/platform/labels';
import type { CartResponse, OrderDetail } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

export default function BuyerCheckoutPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']}>
      <BuyerCheckoutInner />
    </RequireAuth>
  );
}

function BuyerCheckoutInner() {
  const router = useRouter();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [billingSame, setBillingSame] = useState(true);
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    contactPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    billingAddressLine1: '',
    billingAddressLine2: '',
    billingCity: '',
    billingState: '',
    billingPincode: '',
    billingCountry: 'India',
    gstin: '',
    purchaseOrderNumber: '',
  });

  useEffect(() => {
    fetchCart()
      .then((c) => {
        setCart(c);
        if (c.items.length === 0) {
          setError('Your cart is empty.');
        }
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load cart'),
      );
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const shipping = {
        companyName: form.companyName,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: form.country,
      };
      const order = await apiRequest<OrderDetail>('/buyer/checkout/place', {
        method: 'POST',
        auth: true,
        body: {
          shipping,
          billingSameAsShipping: billingSame,
          billing: billingSame
            ? undefined
            : {
                companyName: form.companyName,
                contactName: form.contactName,
                contactPhone: form.contactPhone,
                addressLine1: form.billingAddressLine1,
                addressLine2: form.billingAddressLine2 || undefined,
                city: form.billingCity,
                state: form.billingState,
                pincode: form.billingPincode,
                country: form.billingCountry,
              },
          gstin: form.gstin || undefined,
          purchaseOrderNumber: form.purchaseOrderNumber || undefined,
        },
      });
      router.push(`/buyer/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart) {
    return (
      <div className="platform-grid" aria-busy="true">
        <div className="platform-skeleton" style={{ height: 28, width: '40%' }} />
      </div>
    );
  }

  return (
    <>
      <PlatformPageHeader
        title="Checkout"
        subtitle={
          cart.partnerOrganization
            ? `Order from ${cart.partnerOrganization.companyName}`
            : undefined
        }
        backHref="/buyer/cart"
        backLabel="Cart"
      />
      {error && <div className="platform-card platform-error">{error}</div>}
      {cart.items.length > 0 && (
        <form className="platform-detail-layout" onSubmit={onSubmit}>
          <div className="platform-card platform-form">
            <h3 style={{ marginTop: 0 }}>Shipping</h3>
            <label>Company name</label>
            <input
              required
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            />
            <label>Contact name</label>
            <input
              required
              value={form.contactName}
              onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
            />
            <label>Phone</label>
            <input
              required
              value={form.contactPhone}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
            />
            <label>Address line 1</label>
            <input
              required
              value={form.addressLine1}
              onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
            />
            <label>Address line 2 (optional)</label>
            <input
              value={form.addressLine2}
              onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
            />
            <label>City</label>
            <input
              required
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
            <label>State</label>
            <input
              required
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            />
            <label>Pincode</label>
            <input
              required
              value={form.pincode}
              onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
            />
            <label>Country</label>
            <input
              required
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <input
                type="checkbox"
                checked={billingSame}
                onChange={(e) => setBillingSame(e.target.checked)}
              />
              Billing address same as shipping
            </label>

            {!billingSame && (
              <>
                <h3>Billing</h3>
                <label>Billing address line 1</label>
                <input
                  required
                  value={form.billingAddressLine1}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, billingAddressLine1: e.target.value }))
                  }
                />
                <label>Billing address line 2 (optional)</label>
                <input
                  value={form.billingAddressLine2}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, billingAddressLine2: e.target.value }))
                  }
                />
                <label>City</label>
                <input
                  required
                  value={form.billingCity}
                  onChange={(e) => setForm((f) => ({ ...f, billingCity: e.target.value }))}
                />
                <label>State</label>
                <input
                  required
                  value={form.billingState}
                  onChange={(e) => setForm((f) => ({ ...f, billingState: e.target.value }))}
                />
                <label>Pincode</label>
                <input
                  required
                  value={form.billingPincode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, billingPincode: e.target.value }))
                  }
                />
                <label>Country</label>
                <input
                  required
                  value={form.billingCountry}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, billingCountry: e.target.value }))
                  }
                />
              </>
            )}

            <h3>Business details</h3>
            <label>GSTIN (optional)</label>
            <input
              value={form.gstin}
              onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
            />
            <label>PO number (optional)</label>
            <input
              value={form.purchaseOrderNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, purchaseOrderNumber: e.target.value }))
              }
            />
          </div>

          <aside>
            <div className="platform-card">
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Order summary</p>
              <ul style={{ margin: '0 0 1rem', paddingLeft: '1.1rem', fontSize: '0.875rem' }}>
                {cart.items.map((item) => (
                  <li key={item.id}>
                    {item.listing.name} × {item.quantity}
                  </li>
                ))}
              </ul>
              <p style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 700 }}>
                {formatPrice(false, cart.subtotalInr)}
              </p>
              <button
                type="submit"
                className="platform-btn platform-btn-cta platform-btn-full"
                disabled={submitting}
                aria-busy={submitting}
              >
                Place order (pay offline)
              </button>
              <p className="platform-muted" style={{ margin: '0.75rem 0 0', fontSize: '0.75rem' }}>
                Payment gateway integration is Phase 3. Your order will be confirmed with payment
                status pending.
              </p>
            </div>
          </aside>
        </form>
      )}
      {cart.items.length === 0 && !error && (
        <p>
          <Link href="/marketplace">Return to marketplace</Link>
        </p>
      )}
    </>
  );
}
