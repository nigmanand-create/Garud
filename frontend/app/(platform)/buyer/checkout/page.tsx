'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api/client';
import { fetchCart } from '@/lib/api/cart';
import { fetchBuyerAddresses } from '@/lib/api/buyer-addresses';
import { RequireAuth, useAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { formatPrice } from '@/lib/platform/labels';
import { resolveListingImageUrl } from '@/lib/platform/listing-media';
import { PaymentGatewayModal } from '@/components/platform/PaymentGatewayModal';
import type {
  BuyerAddress,
  CartResponse,
  CheckoutConfig,
  CheckoutSavedAddressResponse,
  OrderDetail,
  SellerCart,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type PaymentMode =
  | 'ONLINE'
  | 'BANK_TRANSFER'
  | 'OFFLINE_PO'
  | 'CASH_ON_DELIVERY';

type CheckoutStep = 'address' | 'review' | 'payment';

const ADDRESS_NONE = '__new__';

function deliveryContactLine(contactName: string, companyName: string) {
  const c = contactName.trim();
  const org = companyName.trim();
  if (org) return `${c} · ${org}`;
  return c;
}

function addressToFormFields(a: BuyerAddress) {
  return {
    companyName: a.companyName,
    contactName: a.contactName,
    contactPhone: a.contactPhone,
    addressLine1: a.line1,
    addressLine2: a.line2 || '',
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    country: a.country || 'India',
  };
}

export default function BuyerCheckoutPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']}>
      <BuyerCheckoutInner />
    </RequireAuth>
  );
}

function BuyerCheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorFromQuery = searchParams.get('vendor');
  const { user } = useAuth();

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
    purchaseOrderNumber: '',
  });
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('ONLINE');
  const [createdOrder, setCreatedOrder] = useState<OrderDetail | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('address');
  const [addressBook, setAddressBook] = useState<BuyerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(ADDRESS_NONE);

  const [loadingAddress, setLoadingAddress] = useState(true);
  const [codEnabled, setCodEnabled] = useState(false);
  const [saveNewToBook, setSaveNewToBook] = useState(false);
  const [saveAddressLabel, setSaveAddressLabel] = useState('Home / Office');
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const checkoutCart: SellerCart | null = useMemo(() => {
    if (!cart || cart.sellerCarts.length === 0) return null;
    if (vendorFromQuery) {
      const found = cart.sellerCarts.find(
        (s) => s.partnerOrganization.id === vendorFromQuery,
      );
      return found ?? null;
    }
    if (cart.sellerCarts.length === 1) return cart.sellerCarts[0];
    return null;
  }, [cart, vendorFromQuery]);

  useEffect(() => {
    let cancelled = false;

    fetchCart()
      .then((c) => {
        if (!cancelled) setCart(c);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load cart'),
      );

    apiRequest<CheckoutConfig>('/buyer/checkout/config', { auth: true })
      .then((cfg) => {
        if (!cancelled) setCodEnabled(Boolean(cfg.codEnabled));
      })
      .catch(() => {
        if (!cancelled) setCodEnabled(false);
      });

    Promise.all([
      apiRequest<CheckoutSavedAddressResponse>('/buyer/checkout/saved-address', {
        auth: true,
      }),
      fetchBuyerAddresses().catch(() => ({ addresses: [] as BuyerAddress[] })),
    ])
      .then(([savedRes, bookRes]) => {
        if (cancelled) return;

        setAddressBook(bookRes.addresses);

        if (savedRes.address) {
          setForm((prev) => ({
            ...prev,
            ...savedRes.address,
          }));
          setBillingSame(savedRes.address.billingSameAsShipping !== false);
        }

        const apiId = savedRes.selectedBuyerAddressId;
        const bookMatch =
          apiId && bookRes.addresses.some((a) => a.id === apiId) ? apiId : null;

        if (bookMatch) {
          setSelectedAddressId(bookMatch);
        } else if (bookRes.addresses.length > 0) {
          const def = bookRes.addresses.find((a) => a.isDefault);
          setSelectedAddressId((def ?? bookRes.addresses[0]).id);
        } else if (
          savedRes.hasSavedAddress &&
          savedRes.address?.addressLine1 &&
          savedRes.source === 'last_order'
        ) {
          setSelectedAddressId(ADDRESS_NONE);
        } else if (
          savedRes.address &&
          savedRes.address.addressLine1 &&
          savedRes.source !== 'organization'
        ) {
          setSelectedAddressId(ADDRESS_NONE);
        } else {
          setSelectedAddressId(ADDRESS_NONE);
        }
      })
      .catch((err) => {
        console.warn('Could not load saved address:', err);
        setSelectedAddressId(ADDRESS_NONE);
      })
      .finally(() => {
        if (!cancelled) setLoadingAddress(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedAddressId === ADDRESS_NONE) return;
    const row = addressBook.find((a) => a.id === selectedAddressId);
    if (!row) return;
    setForm((prev) => ({
      ...prev,
      ...addressToFormFields(row),
      billingAddressLine1: row.line1,
      billingAddressLine2: row.line2 || '',
      billingCity: row.city,
      billingState: row.state,
      billingPincode: row.pincode,
      billingCountry: row.country || 'India',
    }));
    setBillingSame(true);
  }, [selectedAddressId, addressBook]);

  useEffect(() => {
    if (selectedAddressId !== ADDRESS_NONE) return;
    const fromProfile = user?.contactPersonName?.trim();
    if (!fromProfile) return;
    setForm((prev) =>
      prev.contactName.trim() ? prev : { ...prev, contactName: fromProfile },
    );
  }, [selectedAddressId, user?.contactPersonName]);

  useEffect(() => {
    if (!cart) return;
    if (cart.sellerCarts.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    if (cart.sellerCarts.length > 1 && !vendorFromQuery) {
      setError(
        'You have items from multiple sellers. Open checkout from the cart for each seller.',
      );
      return;
    }
    if (vendorFromQuery && !checkoutCart) {
      setError('No cart found for that seller. Return to the cart and pick a seller.');
      return;
    }
    setError(null);
  }, [cart, vendorFromQuery, checkoutCart]);

  function validateShipping(): boolean {
    if (
      !form.contactName ||
      !form.contactPhone ||
      !form.addressLine1 ||
      !form.city ||
      !form.state ||
      !form.pincode
    ) {
      setError('Please complete all required shipping fields.');
      return false;
    }
    if (
      !billingSame &&
      (!form.billingAddressLine1 ||
        !form.billingCity ||
        !form.billingState ||
        !form.billingPincode)
    ) {
      setError('Please complete billing address or use same as shipping.');
      return false;
    }
    return true;
  }

  function continueToReview() {
    setError(null);
    if (selectedAddressId !== ADDRESS_NONE) {
      const found = addressBook.find((a) => a.id === selectedAddressId);
      if (!found) {
        setError('Pick a saved address or choose “New address”.');
        return;
      }
      setCheckoutStep('review');
      return;
    }
    if (!validateShipping()) return;
    setCheckoutStep('review');
  }

  function backToAddress() {
    setCheckoutStep('address');
  }

  function continueToPayment() {
    setError(null);
    setCheckoutStep('payment');
  }

  function backToReview() {
    setCheckoutStep('review');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!checkoutCart || checkoutStep !== 'payment') return;
    setError(null);
    setSubmitting(true);
    try {
      const usingBookId =
        selectedAddressId !== ADDRESS_NONE
          ? addressBook.some((a) => a.id === selectedAddressId)
          : false;

      const shipping = {
        companyName: form.companyName.trim() || undefined,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: form.country,
      };

      const body: Record<string, unknown> = {
        billingSameAsShipping: billingSame,
        billing: billingSame
          ? undefined
          : {
              companyName: form.companyName.trim() || undefined,
              contactName: form.contactName,
              contactPhone: form.contactPhone,
              addressLine1: form.billingAddressLine1,
              addressLine2: form.billingAddressLine2 || undefined,
              city: form.billingCity,
              state: form.billingState,
              pincode: form.billingPincode,
              country: form.billingCountry,
            },
        purchaseOrderNumber: form.purchaseOrderNumber || undefined,
        vendorOrganizationId: checkoutCart.partnerOrganization.id,
        paymentMethod: paymentMode,
      };

      if (usingBookId) {
        body.buyerAddressId = selectedAddressId;
      } else {
        body.shipping = shipping;
        if (saveNewToBook) {
          body.saveNewAddressToBook = true;
          body.saveAddressLabel = saveAddressLabel.trim() || 'Saved address';
          body.saveAddressAsDefault = saveAsDefault;
        }
      }

      const order = await apiRequest<OrderDetail>('/buyer/checkout/place', {
        method: 'POST',
        auth: true,
        body,
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

  if (!cart || loadingAddress) {
    return (
      <div className="platform-grid" aria-busy="true">
        <div className="platform-skeleton platform-skeleton-line platform-skeleton-line--short platform-skeleton-line--title" />
      </div>
    );
  }

  const canSubmit = Boolean(checkoutCart && checkoutCart.items.length > 0);
  const vendorQs = vendorFromQuery
    ? `?vendor=${encodeURIComponent(vendorFromQuery)}`
    : '';
  const addressesManageHref = `/buyer/addresses${vendorQs}`;

  return (
    <>
      <PlatformPageHeader
        title="Checkout"
        subtitle={
          checkoutCart
            ? `Order from ${checkoutCart.partnerOrganization.companyName}`
            : undefined
        }
        backHref="/buyer/cart"
        backLabel="Cart"
      />

      <p className="platform-muted platform-text-sm platform-mb-md" aria-label="Checkout progress">
        {checkoutStep === 'address' ? (
          <>
            <strong>Step 1 of 3</strong>: Delivery address
          </>
        ) : checkoutStep === 'review' ? (
          <>
            <strong>Step 2 of 3</strong>: Review order
          </>
        ) : (
          <>
            <strong>Step 3 of 3</strong>: Payment
          </>
        )}
      </p>

      {error && (
        <div className="platform-card platform-error">
          {error}{' '}
          {error.includes('multiple sellers') || error.includes('No cart') ? (
            <Link href="/buyer/cart">Go to cart</Link>
          ) : null}
        </div>
      )}

      {canSubmit && (
        <form className="platform-detail-layout" onSubmit={onSubmit}>
          <div className="platform-card platform-form">
            {checkoutStep === 'address' && (
              <>
                <div className="platform-form-edit-head">
                  <h3 className="platform-section-heading">
                    <span aria-hidden>📦</span> Delivery address
                  </h3>
                  <Link
                    href={addressesManageHref}
                    className="platform-form-cancel-link"
                  >
                    Manage saved addresses
                  </Link>
                </div>
                <p className="platform-muted platform-text-muted-sm platform-mb-md">
                  Choose where this order should ship. You can add or edit addresses in your{' '}
                  <Link href="/buyer/addresses" className="platform-inline-link">
                    address book
                  </Link>
                  .
                </p>

                {addressBook.length > 0 && (
                  <div className="platform-radio-stack platform-mb-md" role="radiogroup" aria-label="Saved addresses">
                    {addressBook.map((a) => (
                      <label
                        key={a.id}
                        className={`platform-radio-card ${
                          selectedAddressId === a.id ? 'platform-radio-card--selected' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="savedShippingAddress"
                          checked={selectedAddressId === a.id}
                          onChange={() => setSelectedAddressId(a.id)}
                        />
                        <div>
                          <div className="platform-radio-card__title">
                            {a.label}
                            {a.isDefault ? (
                              <span
                                className="platform-badge-saved"
                                style={{ marginLeft: '0.5rem' }}
                              >
                                DEFAULT
                              </span>
                            ) : null}
                          </div>
                          <div className="platform-radio-card__desc">
                            {deliveryContactLine(a.contactName, a.companyName)}
                            <br />
                            {a.line1}
                            {a.line2 ? `, ${a.line2}` : ''} · {a.city}, {a.state} —{' '}
                            {a.pincode}
                          </div>
                        </div>
                      </label>
                    ))}

                    <label
                      className={`platform-radio-card ${
                        selectedAddressId === ADDRESS_NONE ? 'platform-radio-card--selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="savedShippingAddress"
                        checked={selectedAddressId === ADDRESS_NONE}
                        onChange={() => setSelectedAddressId(ADDRESS_NONE)}
                      />
                      <div>
                        <div className="platform-radio-card__title">New address</div>
                        <div className="platform-radio-card__desc">
                          Enter shipping details for this order (you can save them at payment).
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {selectedAddressId === ADDRESS_NONE && (
                  <>
                    <label htmlFor="ship-company">Company / organization (optional)</label>
                    <input
                      id="ship-company"
                      placeholder="Leave blank for personal delivery"
                      value={form.companyName}
                      onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                      aria-describedby="ship-company-hint"
                    />
                    <p id="ship-company-hint" className="platform-muted platform-text-muted-sm platform-mb-md">
                      Add a business or department name if relevant; skip for home delivery.
                    </p>
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
                  </>
                )}

                <label className="platform-field-checkbox platform-mt-md">
                  <input
                    type="checkbox"
                    checked={billingSame}
                    onChange={(e) => setBillingSame(e.target.checked)}
                  />
                  Billing address same as shipping
                </label>

                {!billingSame && (
                  <>
                    <h3 className="platform-section-heading platform-mt-md">Billing address</h3>
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
                          onChange={(e) =>
                            setForm((f) => ({ ...f, billingCity: e.target.value }))
                          }
                        />
                      </div>
                      <div className="platform-field">
                        <label htmlFor="bill-state">State</label>
                        <input
                          id="bill-state"
                          required
                          value={form.billingState}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, billingState: e.target.value }))
                          }
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

                <button
                  type="button"
                  className="platform-btn platform-btn-cta platform-btn-full platform-mt-md"
                  onClick={continueToReview}
                >
                  Continue to review order
                </button>
              </>
            )}

            {checkoutStep === 'review' && (
              <>
                <button
                  type="button"
                  className="platform-form-cancel-link platform-mb-md"
                  onClick={backToAddress}
                >
                  ← Back to address
                </button>

                <div className="platform-address-saved platform-mb-md">
                  <div className="platform-address-saved__title-row">
                    <strong className="platform-section-heading">Deliver to</strong>
                  </div>
                  <div className="platform-address-saved__name">
                    {deliveryContactLine(form.contactName, form.companyName)}
                  </div>
                  <div className="platform-address-saved__body">
                    {form.addressLine1}
                    {form.addressLine2 ? `, ${form.addressLine2}` : ''}
                    <br />
                    {form.city}, {form.state} — <strong>{form.pincode}</strong>, {form.country}
                  </div>
                  <div className="platform-address-saved__meta">
                    📞 <strong>{form.contactPhone}</strong>
                  </div>
                </div>

                {selectedAddressId === ADDRESS_NONE && (
                  <label className="platform-field-checkbox platform-mb-md">
                    <input
                      type="checkbox"
                      checked={saveNewToBook}
                      onChange={(e) => setSaveNewToBook(e.target.checked)}
                    />
                    Save this address for future orders
                  </label>
                )}
                {selectedAddressId === ADDRESS_NONE && saveNewToBook && (
                  <>
                    <label htmlFor="save-label">Address label</label>
                    <input
                      id="save-label"
                      value={saveAddressLabel}
                      onChange={(e) => setSaveAddressLabel(e.target.value)}
                      placeholder="e.g. Head office, Plant 2"
                    />
                    <label className="platform-field-checkbox">
                      <input
                        type="checkbox"
                        checked={saveAsDefault}
                        onChange={(e) => setSaveAsDefault(e.target.checked)}
                      />
                      Set as default address
                    </label>
                  </>
                )}

                <div className="platform-field platform-mb-md">
                  <label htmlFor="checkout-po">Purchase order (PO) number (optional)</label>
                  <input
                    id="checkout-po"
                    placeholder="e.g. PO-2026-DRONE-01"
                    value={form.purchaseOrderNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, purchaseOrderNumber: e.target.value }))
                    }
                  />
                </div>

                <button
                  type="button"
                  className="platform-btn platform-btn-cta platform-btn-full platform-mt-md"
                  onClick={continueToPayment}
                >
                  Continue to payment
                </button>
              </>
            )}

            {checkoutStep === 'payment' && (
              <>
                <button
                  type="button"
                  className="platform-form-cancel-link platform-mb-md"
                  onClick={backToReview}
                >
                  ← Back to review
                </button>

                <div className="platform-form-divider">
                  <h3 className="platform-section-heading">Payment method</h3>
                  <p className="platform-muted platform-text-muted-sm">
                    Choose how your organization will complete this order.
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
                          ⚡ Pay online (Razorpay — UPI, cards, netbanking)
                          <span className="platform-badge-pill platform-badge-pill--success">
                            Recommended
                          </span>
                        </div>
                        <div className="platform-radio-card__desc">
                          Immediate verification after payment.
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
                          🏦 Bank transfer (NEFT / RTGS)
                        </div>
                        <div className="platform-radio-card__desc">
                          You’ll confirm with bank / UTR details after placing the order.
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
                          📄 Purchase order / pay later
                        </div>
                        <div className="platform-radio-card__desc">
                          Confirm the order now; settle payment offline later.
                        </div>
                      </div>
                    </label>

                    {codEnabled && (
                      <label
                        className={`platform-radio-card ${
                          paymentMode === 'CASH_ON_DELIVERY'
                            ? 'platform-radio-card--selected'
                            : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMode"
                          checked={paymentMode === 'CASH_ON_DELIVERY'}
                          onChange={() => setPaymentMode('CASH_ON_DELIVERY')}
                        />
                        <div>
                          <div className="platform-radio-card__title">💵 Cash on delivery (COD)</div>
                          <div className="platform-radio-card__desc">
                            Pay when the shipment arrives (no Razorpay step for this order).
                          </div>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <aside>
            <div className="platform-card">
              <p className="platform-order-total-label">Order summary</p>
              <ul className="platform-checkout-summary-lines">
                {checkoutCart!.items.map((item) => {
                  const thumb = resolveListingImageUrl(item.listing.primaryImageUrl);
                  return (
                    <li key={item.id} className="platform-checkout-summary-line">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="platform-checkout-summary-thumb"
                        />
                      ) : (
                        <div
                          className="platform-checkout-summary-thumb platform-checkout-summary-thumb--ph"
                          aria-hidden
                        >
                          ✦
                        </div>
                      )}
                      <div>
                        <span className="platform-checkout-summary-name">{item.listing.name}</span>
                        <span className="platform-muted platform-text-muted-sm">
                          {' '}
                          × {item.quantity} · {formatPrice(false, item.lineTotalInr)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="platform-order-total-amount">
                {formatPrice(false, checkoutCart!.subtotalInr)}
              </p>
              <p className="platform-muted platform-text-muted-sm">
                Subtotal for this seller (list price × quantity). Shipping is arranged with the seller.
              </p>
              {checkoutStep === 'payment' && (
                <>
                  <button
                    type="submit"
                    className="platform-btn platform-btn-cta platform-btn-full platform-mt-md"
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    {paymentMode === 'ONLINE'
                      ? `Pay ${formatPrice(false, checkoutCart!.subtotalInr)}`
                      : paymentMode === 'BANK_TRANSFER'
                        ? 'Place order & view bank details'
                        : paymentMode === 'CASH_ON_DELIVERY'
                          ? 'Place COD order'
                          : 'Place order'}
                  </button>
                  <p className="platform-muted platform-assurance-note">
                    {paymentMode === 'ONLINE'
                      ? '🔒 Encrypted checkout via Razorpay.'
                      : paymentMode === 'BANK_TRANSFER'
                        ? '🏛 Use the order page for wire instructions and UTR.'
                        : paymentMode === 'CASH_ON_DELIVERY'
                          ? 'COD: pay on delivery.'
                          : 'You can complete payment from your order page.'}
                  </p>
                </>
              )}
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

      {cart.sellerCarts.length === 0 && !error && (
        <p>
          <Link href="/marketplace">Return to marketplace</Link>
        </p>
      )}
    </>
  );
}
