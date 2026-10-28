'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { PaymentGatewayModal } from '@/components/platform/PaymentGatewayModal';
import { ESCROW_BANK_DETAILS } from '@/lib/api/payments';
import { formatPrice } from '@/lib/platform/labels';
import { fulfillmentTimelineText } from '@/lib/platform/fulfillment';
import { OrderProgressStepper } from '@/components/platform/OrderProgressStepper';
import { ShipmentTrackingCard } from '@/components/platform/ShipmentTrackingCard';
import { Button } from '@/components/platform/Button';
import type { OrderDetail } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

export default function BuyerOrderDetailPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']}>
      <BuyerOrderDetailInner />
    </RequireAuth>
  );
}

function BuyerOrderDetailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isJustPaid = searchParams.get('paid') === '1';

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(
    isJustPaid ? 'Payment received successfully! Your order is now verified and processing.' : null,
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);

  function loadOrder() {
    apiRequest<OrderDetail>(`/buyer/orders/${id}`, { auth: true })
      .then(setOrder)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Order not found'),
      );
  }

  useEffect(() => {
    loadOrder();
  }, [id]);

  if (error) {
    return <div className="platform-card platform-error">{error}</div>;
  }
  if (!order) {
    return (
      <div className="platform-grid" aria-busy="true">
        <div className="platform-skeleton platform-skeleton-bar" style={{ width: '50%' }} />
      </div>
    );
  }

  const paymentCardClass =
    order.paymentStatus === 'PAID'
      ? 'platform-card platform-payment-card platform-payment-card--paid'
      : 'platform-card platform-payment-card';

  return (
    <>
      <PlatformPageHeader
        title={`Order #${order.id.slice(0, 8)}…`}
        subtitle={
          <>
            Placed {new Date(order.placedAt).toLocaleString('en-IN')} ·{' '}
            {order.vendorOrganization.companyName}
            {order.rfqId && (
              <>
                {' '}·{' '}
                <Link href={`/buyer/rfqs/${order.rfqId}`} className="platform-inline-link">
                  Procured via RFQ ↗
                </Link>
              </>
            )}
          </>
        }
        backHref="/buyer/orders"
        backLabel="My orders"
      />

      {successMsg && (
        <div className="platform-flash-success" role="status">
          <div className="platform-flash-success__content">
            <span aria-hidden>✓</span>
            <span className="platform-font-semibold">{successMsg}</span>
          </div>
          <button
            type="button"
            className="platform-flash-dismiss"
            onClick={() => setSuccessMsg(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <OrderProgressStepper order={order} />

      <div className="platform-detail-layout">
        <div className="platform-stack platform-stack--lg">
          <ShipmentTrackingCard order={order} />

          <div className="platform-card">
            <p className="platform-status-row">
              <StatusBadge status={order.status} />{' '}
              <StatusBadge status={order.fulfillmentStatus} />{' '}
              <StatusBadge status={order.paymentStatus} />
            </p>
            <p className="platform-muted platform-text-sm">
              {fulfillmentTimelineText(order.fulfillmentStatus)}
            </p>

            <h3 className="platform-section-heading platform-mt-md">Line items</h3>
            <div className="platform-table-wrap">
              <table className="platform-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lineItems.map((li) => (
                    <tr key={li.id}>
                      <td>
                        <div className="platform-line-item-cell">
                          <div className="platform-line-item-thumb">
                            {li.imageUrl ? (
                              <img src={li.imageUrl} alt={li.name} />
                            ) : (
                              <span aria-hidden>🛸</span>
                            )}
                          </div>
                          <div>
                            {li.listingId ? (
                              <Link
                                href={`/marketplace/listings/${li.listingId}`}
                                className="platform-line-item-title"
                              >
                                {li.name}
                              </Link>
                            ) : (
                              <span className="platform-font-semibold">{li.name}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="platform-font-mono platform-text-sm">{li.sku ?? '—'}</td>
                      <td>{li.quantity}</td>
                      <td>{formatPrice(false, li.unitPriceInr)}</td>
                      <td className="platform-font-semibold">{formatPrice(false, li.lineTotalInr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="platform-order-total">
              Total: {formatPrice(false, order.totalInr)}
            </p>
          </div>

          {order.transactions && order.transactions.length > 0 && (
            <div className="platform-card">
              <h3 className="platform-section-heading">
                Payment Transactions & Activity
              </h3>
              <div className="platform-table-wrap">
                <table className="platform-table">
                  <thead>
                    <tr>
                      <th>Gateway</th>
                      <th>Reference / UTR</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>
                          <strong>{tx.gateway === 'RAZORPAY' ? 'Razorpay Gateway' : 'Bank Wire (NEFT/RTGS)'}</strong>
                        </td>
                        <td>
                          {tx.utrNumber ? (
                            <span className="platform-font-mono platform-font-semibold">UTR: {tx.utrNumber}</span>
                          ) : tx.gatewayPaymentId ? (
                            <span className="platform-font-mono">ID: {tx.gatewayPaymentId}</span>
                          ) : tx.gatewayOrderId ? (
                            <span className="platform-font-mono platform-muted">Order: {tx.gatewayOrderId}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{tx.paymentMethod ?? 'online'}</td>
                        <td>{formatPrice(false, tx.amountInr)}</td>
                        <td>
                          <StatusBadge status={tx.status} />
                        </td>
                        <td className="platform-text-xs platform-muted">
                          {new Date(tx.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <aside className="platform-stack platform-stack--lg">
          <div className={paymentCardClass}>
            <div className="platform-payment-card__head">
              <span>Payment Status</span>
              <StatusBadge status={order.paymentStatus} />
            </div>

            {order.paymentStatus === 'PAID' ? (
              <p className="platform-text-sm platform-mt-sm" style={{ color: 'var(--platform-success)', lineHeight: 1.5 }}>
                ✓ Order settlement completed in full. The vendor has been notified to proceed with dispatch & fulfillment.
              </p>
            ) : order.paymentStatus === 'PENDING' ? (
              <div className="platform-payment-card__body">
                <p className="platform-muted platform-text-sm" style={{ margin: '0 0 1rem', lineHeight: 1.5 }}>
                  Payment of <strong>{formatPrice(false, order.totalInr)}</strong> is pending. You can pay instantly online or submit your corporate wire UTR reference:
                </p>

                <div className="platform-payment-card__actions">
                  <Button
                    type="button"
                    variant="cta"
                    fullWidth
                    onClick={() => setShowPaymentModal(true)}
                  >
                    ⚡ Pay Now Online (Razorpay)
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    size="sm"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    🏦 Submit NEFT / RTGS Wire UTR
                  </Button>

                  <button
                    type="button"
                    className="platform-link-btn platform-text-xs"
                    style={{ textAlign: 'center', marginTop: '0.25rem' }}
                    onClick={() => setShowBankDetails(!showBankDetails)}
                  >
                    {showBankDetails ? 'Hide Escrow Bank Details ▲' : 'View Escrow Bank Details ▼'}
                  </button>

                  {showBankDetails && (
                    <div className="platform-escrow-details">
                      <div><strong>Bank:</strong> {ESCROW_BANK_DETAILS.bankName}</div>
                      <div><strong>A/C Name:</strong> {ESCROW_BANK_DETAILS.accountName}</div>
                      <div><strong>A/C No:</strong> <span className="platform-font-mono">{ESCROW_BANK_DETAILS.accountNumber}</span></div>
                      <div><strong>IFSC:</strong> <span className="platform-font-mono">{ESCROW_BANK_DETAILS.ifscCode}</span></div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="platform-muted platform-text-sm platform-mt-sm">
                Status: {order.paymentStatus}
              </p>
            )}
          </div>

          <div className="platform-card platform-prose">
            <h3 className="platform-section-heading">Shipping & Contact</h3>
            <p style={{ margin: 0 }}>
              {order.companyName}<br />
              {order.contactName} · {order.contactPhone}<br />
              {order.shipping.addressLine1}
              {order.shipping.addressLine2 ? `, ${order.shipping.addressLine2}` : ''}
              <br />
              {order.shipping.city}, {order.shipping.state} {order.shipping.pincode}
              <br />
              {order.shipping.country}
            </p>
            {order.gstin && (
              <>
                <h3 className="platform-section-heading platform-mt-md">GSTIN</h3>
                <p>{order.gstin}</p>
              </>
            )}
            {order.purchaseOrderNumber && (
              <>
                <h3 className="platform-section-heading platform-mt-md">PO number</h3>
                <p>{order.purchaseOrderNumber}</p>
              </>
            )}
          </div>
        </aside>
      </div>

      {showPaymentModal && (
        <PaymentGatewayModal
          orderId={order.id}
          totalInr={order.totalInr}
          companyName={order.companyName}
          contactName={order.contactName}
          contactPhone={order.contactPhone}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSuccessMsg('Payment activity recorded! Updating order…');
            loadOrder();
          }}
        />
      )}
    </>
  );
}
