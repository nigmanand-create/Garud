'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api/client';
import { fetchCart } from '@/lib/api/cart';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { formatPrice } from '@/lib/platform/labels';
import { PaymentGatewayModal } from '@/components/platform/PaymentGatewayModal';
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
  const [paymentMode, setPaymentMode] = useState<'ONLINE' | 'BANK_TRANSFER' | 'OFFLINE_PO'>('ONLINE');
  const [createdOrder, setCreatedOrder] = useState<OrderDetail | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [hasSavedAddress, setHasSavedAddress] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(true);

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

    // Fetch saved address from previous order / organization
    apiRequest<{ hasSavedAddress: boolean; address: any }>('/buyer/checkout/saved-address', { auth: true })
      .then((res) => {
        if (res.hasSavedAddress && res.address && res.address.addressLine1) {
          setForm((prev) => ({
            ...prev,
            ...res.address,
          }));
          setBillingSame(res.address.billingSameAsShipping !== false);
          setHasSavedAddress(true);
          setIsEditingAddress(false);
        } else if (res.address) {
          setForm((prev) => ({
            ...prev,
            companyName: res.address.companyName || prev.companyName,
            contactName: res.address.contactName || prev.contactName,
            contactPhone: res.address.contactPhone || prev.contactPhone,
            city: res.address.city || prev.city,
            state: res.address.state || prev.state,
            country: res.address.country || prev.country,
            gstin: res.address.gstin || prev.gstin,
          }));
          setHasSavedAddress(false);
          setIsEditingAddress(true);
        }
      })
      .catch((err) => {
        console.warn('Could not load saved address:', err);
        setHasSavedAddress(false);
        setIsEditingAddress(true);
      })
      .finally(() => {
        setLoadingAddress(false);
      });
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

      if (paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER') {
        setCreatedOrder(order);
        setShowPaymentModal(true);
      } else {
        router.push(`/buyer/orders/${order.id}`);
      }
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
            {hasSavedAddress && !isEditingAddress ? (
              /* Saved Address Card View */
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 12,
                  padding: '1.25rem',
                  marginBottom: '1rem',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📦</span>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>Delivery Address</strong>
                    <span
                      style={{
                        background: '#dcfce7',
                        color: '#166534',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        letterSpacing: '0.04em',
                      }}
                    >
                      SAVED ADDRESS
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(true)}
                    className="platform-btn platform-btn-secondary"
                    style={{
                      fontSize: '0.825rem',
                      padding: '0.35rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#ffffff',
                      color: '#2f5233',
                      borderColor: '#2f5233',
                      fontWeight: 600,
                    }}
                  >
                    ✏️ Change / Edit Address
                  </button>
                </div>

                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.2rem' }}>
                  {form.contactName} · <span style={{ color: '#475569', fontWeight: 500 }}>{form.companyName}</span>
                </div>

                <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                  {form.addressLine1}
                  {form.addressLine2 ? `, ${form.addressLine2}` : ''}
                  <br />
                  {form.city}, {form.state} - <strong>{form.pincode}</strong>, {form.country}
                </div>

                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.825rem', color: '#0f172a', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                  <span>📞 Phone: <strong>{form.contactPhone}</strong></span>
                  {form.gstin && (
                    <span>🧾 GSTIN: <strong>{form.gstin}</strong></span>
                  )}
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Purchase Order (PO) Number (Optional)
                  </label>
                  <input
                    placeholder="e.g. PO-2026-DRONE-01"
                    value={form.purchaseOrderNumber}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseOrderNumber: e.target.value }))}
                    style={{ maxWidth: 300 }}
                  />
                </div>
              </div>
            ) : (
              /* Address Edit / Entry Form View */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>
                    {hasSavedAddress ? '✏️ Edit / Change Delivery Address' : 'Shipping Address'}
                  </h3>
                  {hasSavedAddress && (
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ✕ Cancel (Keep Saved Address)
                    </button>
                  )}
                </div>

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
                  placeholder="Street address, building, plot no."
                  value={form.addressLine1}
                  onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
                />
                <label>Address line 2 (optional)</label>
                <input
                  placeholder="Apartment, suite, landmark"
                  value={form.addressLine2}
                  onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label>City</label>
                    <input
                      required
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>State</label>
                    <input
                      required
                      value={form.state}
                      onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label>Pincode</label>
                    <input
                      required
                      placeholder="6 digits pincode"
                      value={form.pincode}
                      onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Country</label>
                    <input
                      required
                      value={form.country}
                      onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    />
                  </div>
                </div>

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
                    <h3 style={{ marginTop: '1.25rem' }}>Billing Address</h3>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label>City</label>
                        <input
                          required
                          value={form.billingCity}
                          onChange={(e) => setForm((f) => ({ ...f, billingCity: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label>State</label>
                        <input
                          required
                          value={form.billingState}
                          onChange={(e) => setForm((f) => ({ ...f, billingState: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label>Pincode</label>
                        <input
                          required
                          value={form.billingPincode}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, billingPincode: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label>Country</label>
                        <input
                          required
                          value={form.billingCountry}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, billingCountry: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                <h3 style={{ marginTop: '1.25rem' }}>Business Details</h3>
                <label>GSTIN (Optional)</label>
                <input
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={form.gstin}
                  onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
                />
                <label>PO number (Optional)</label>
                <input
                  placeholder="e.g. PO-2026-DRONE-01"
                  value={form.purchaseOrderNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, purchaseOrderNumber: e.target.value }))
                  }
                />

                {form.addressLine1 && form.city && form.pincode && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!form.companyName || !form.contactName || !form.contactPhone || !form.addressLine1 || !form.city || !form.state || !form.pincode) {
                        setError('Please complete all required address fields before locking address.');
                        return;
                      }
                      setError(null);
                      setHasSavedAddress(true);
                      setIsEditingAddress(false);
                    }}
                    className="platform-btn platform-btn-secondary"
                    style={{ marginTop: '1rem', background: '#2f5233', color: '#ffffff', borderColor: '#2f5233' }}
                  >
                    ✓ Save & Deliver to This Address
                  </button>
                )}
              </div>
            )}

            <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.25rem' }}>Select Payment Method</h3>
              <p className="platform-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                Choose how your organization will complete this B2B drone order:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 8,
                    border: paymentMode === 'ONLINE' ? '2px solid #2f5233' : '1px solid #cbd5e1',
                    background: paymentMode === 'ONLINE' ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMode"
                    checked={paymentMode === 'ONLINE'}
                    onChange={() => setPaymentMode('ONLINE')}
                    style={{ marginTop: 4 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      ⚡ Instant Online Payment (Razorpay UPI, Corporate Cards, NetBanking)
                      <span style={{ fontSize: '0.675rem', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                        RECOMMENDED
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                      Immediate order verification with automated invoice generation.
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 8,
                    border: paymentMode === 'BANK_TRANSFER' ? '2px solid #2f5233' : '1px solid #cbd5e1',
                    background: paymentMode === 'BANK_TRANSFER' ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMode"
                    checked={paymentMode === 'BANK_TRANSFER'}
                    onChange={() => setPaymentMode('BANK_TRANSFER')}
                    style={{ marginTop: 4 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      🏦 Corporate Bank Transfer (NEFT / RTGS Wire Escrow)
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                      Direct bank wire to Garud Hub platform escrow with UTR reference verification.
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 8,
                    border: paymentMode === 'OFFLINE_PO' ? '2px solid #2f5233' : '1px solid #cbd5e1',
                    background: paymentMode === 'OFFLINE_PO' ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMode"
                    checked={paymentMode === 'OFFLINE_PO'}
                    onChange={() => setPaymentMode('OFFLINE_PO')}
                    style={{ marginTop: 4 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      📄 Purchase Order / Pay Later (Offline PO)
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                      Confirm order now with pending payment. Settle online or via wire later.
                    </div>
                  </div>
                </label>
              </div>
            </div>
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
                {paymentMode === 'ONLINE'
                  ? `Proceed to Payment (${formatPrice(false, cart.subtotalInr)})`
                  : paymentMode === 'BANK_TRANSFER'
                  ? 'Proceed to Bank Wire'
                  : 'Place order (pay offline)'}
              </button>
              <p className="platform-muted" style={{ margin: '0.75rem 0 0', fontSize: '0.75rem' }}>
                {paymentMode === 'ONLINE'
                  ? '🔒 Encrypted with 256-bit SSL. Supported by Razorpay Gateway.'
                  : paymentMode === 'BANK_TRANSFER'
                  ? '🏛 Funds held in platform escrow until vendor fulfillment.'
                  : 'Invoice and payment link will be sent to your registered email.'}
              </p>
            </div>
          </aside>
        </form>
      )}

      {showPaymentModal && createdOrder && (
        <PaymentGatewayModal
          orderId={createdOrder.id}
          totalInr={createdOrder.totalInr}
          companyName={createdOrder.companyName}
          contactName={createdOrder.contactName}
          contactPhone={createdOrder.contactPhone}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            router.push(`/buyer/orders/${createdOrder.id}`);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            router.push(`/buyer/orders/${createdOrder.id}?paid=1`);
          }}
        />
      )}

      {cart.items.length === 0 && !error && (
        <p>
          <Link href="/marketplace">Return to marketplace</Link>
        </p>
      )}
    </>
  );
}
