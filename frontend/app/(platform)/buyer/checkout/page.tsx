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
        <div className="platform-skeleton platform-skeleton-line platform-skeleton-line--short platform-skeleton-line--title" />
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
              <div className="platform-address-saved">
                <div className="platform-address-saved__head">
                  <div className="platform-address-saved__title-row">
                    <span aria-hidden>📦</span>
                    <strong className="platform-section-heading">Delivery Address</strong>
                    <span className="platform-badge-saved">SAVED ADDRESS</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(true)}
                    className="platform-btn platform-btn-secondary platform-btn-sm"
                  >
                    ✏️ Change / Edit Address
                  </button>
                </div>

                <div className="platform-address-saved__name">
                  {form.contactName} · <span>{form.companyName}</span>
                </div>

                <div className="platform-address-saved__body">
                  {form.addressLine1}
                  {form.addressLine2 ? `, ${form.addressLine2}` : ''}
                  <br />
                  {form.city}, {form.state} - <strong>{form.pincode}</strong>, {form.country}
                </div>

                <div className="platform-address-saved__meta">
                  <span>📞 Phone: <strong>{form.contactPhone}</strong></span>
                  {form.gstin && (
                    <span>🧾 GSTIN: <strong>{form.gstin}</strong></span>
                  )}
                </div>

                <div className="platform-address-saved__po platform-field">
                  <label htmlFor="saved-po">Purchase Order (PO) Number (Optional)</label>
                  <input
                    id="saved-po"
                    placeholder="e.g. PO-2026-DRONE-01"
                    value={form.purchaseOrderNumber}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseOrderNumber: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="platform-form-edit-head">
                  <h3 className="platform-section-heading">
                    {hasSavedAddress ? '✏️ Edit / Change Delivery Address' : 'Shipping Address'}
                  </h3>
                  {hasSavedAddress && (
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="platform-form-cancel-link"
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
                <div className="platform-field-row">
                  <div className="platform-field">
                    <label htmlFor="ship-city">City</label>
                    <input
                      id="ship-city"
                      required
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </div>
                  <div className="platform-field">
                    <label htmlFor="ship-state">State</label>
                    <input
                      id="ship-state"
                      required
                      value={form.state}
                      onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="platform-field-row">
                  <div className="platform-field">
                    <label htmlFor="ship-pincode">Pincode</label>
                    <input
                      id="ship-pincode"
                      required
                      placeholder="6 digits pincode"
                      value={form.pincode}
                      onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                    />
                  </div>
                  <div className="platform-field">
                    <label htmlFor="ship-country">Country</label>
                    <input
                      id="ship-country"
                      required
                      value={form.country}
                      onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    />
                  </div>
                </div>

                <label className="platform-field-checkbox">
                  <input
                    type="checkbox"
                    checked={billingSame}
                    onChange={(e) => setBillingSame(e.target.checked)}
                  />
                  Billing address same as shipping
                </label>

                {!billingSame && (
                  <>
                    <h3 className="platform-section-heading platform-mt-md">Billing Address</h3>
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
                    <div className="platform-field-row">
                      <div className="platform-field">
                        <label htmlFor="bill-city">City</label>
                        <input
                          id="bill-city"
                          required
                          value={form.billingCity}
                          onChange={(e) => setForm((f) => ({ ...f, billingCity: e.target.value }))}
                        />
                      </div>
                      <div className="platform-field">
                        <label htmlFor="bill-state">State</label>
                        <input
                          id="bill-state"
                          required
                          value={form.billingState}
                          onChange={(e) => setForm((f) => ({ ...f, billingState: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="platform-field-row">
                      <div className="platform-field">
                        <label htmlFor="bill-pincode">Pincode</label>
                        <input
                          id="bill-pincode"
                          required
                          value={form.billingPincode}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, billingPincode: e.target.value }))
                          }
                        />
                      </div>
                      <div className="platform-field">
                        <label htmlFor="bill-country">Country</label>
                        <input
                          id="bill-country"
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

                <h3 className="platform-section-heading platform-mt-md">Business Details</h3>
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
                    className="platform-btn platform-mt-md"
                  >
                    ✓ Save & Deliver to This Address
                  </button>
                )}
              </div>
            )}

            <div className="platform-form-divider">
              <h3 className="platform-section-heading">Select Payment Method</h3>
              <p className="platform-muted platform-text-muted-sm">
                Choose how your organization will complete this B2B drone order:
              </p>

              <div className="platform-radio-stack platform-mt-md">
                <label
                  className={`platform-radio-card ${
                    paymentMode === 'ONLINE' ? 'platform-radio-card--selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMode"
                    checked={paymentMode === 'ONLINE'}
                    onChange={() => setPaymentMode('ONLINE')}
                  />
                  <div>
                    <div className="platform-radio-card__title">
                      ⚡ Instant Online Payment (Razorpay UPI, Corporate Cards, NetBanking)
                      <span className="platform-badge-pill platform-badge-pill--success">
                        RECOMMENDED
                      </span>
                    </div>
                    <div className="platform-radio-card__desc">
                      Immediate order verification with automated invoice generation.
                    </div>
                  </div>
                </label>

                <label
                  className={`platform-radio-card ${
                    paymentMode === 'BANK_TRANSFER' ? 'platform-radio-card--selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMode"
                    checked={paymentMode === 'BANK_TRANSFER'}
                    onChange={() => setPaymentMode('BANK_TRANSFER')}
                  />
                  <div>
                    <div className="platform-radio-card__title">
                      🏦 Corporate Bank Transfer (NEFT / RTGS Wire Escrow)
                    </div>
                    <div className="platform-radio-card__desc">
                      Direct bank wire to Garud Hub platform escrow with UTR reference verification.
                    </div>
                  </div>
                </label>

                <label
                  className={`platform-radio-card ${
                    paymentMode === 'OFFLINE_PO' ? 'platform-radio-card--selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMode"
                    checked={paymentMode === 'OFFLINE_PO'}
                    onChange={() => setPaymentMode('OFFLINE_PO')}
                  />
                  <div>
                    <div className="platform-radio-card__title">
                      📄 Purchase Order / Pay Later (Offline PO)
                    </div>
                    <div className="platform-radio-card__desc">
                      Confirm order now with pending payment. Settle online or via wire later.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <aside>
            <div className="platform-card">
              <p className="platform-order-total-label">Order summary</p>
              <ul className="platform-order-summary-list">
                {cart.items.map((item) => (
                  <li key={item.id}>
                    {item.listing.name} × {item.quantity}
                  </li>
                ))}
              </ul>
              <p className="platform-order-total-amount">
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
              <p className="platform-muted platform-assurance-note">
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
