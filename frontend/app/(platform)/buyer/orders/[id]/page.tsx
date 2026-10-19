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
        <div className="platform-skeleton" style={{ height: 28, width: '50%' }} />
      </div>
    );
  }

  return (
    <>
      <PlatformPageHeader
        title={`Order #${order.id.slice(0, 8)}…`}
        subtitle={
          <>
            Placed {new Date(order.placedAt).toLocaleString('en-IN')} ·{' '}
            {order.vendorOrganization.companyName}
          </>
        }
        backHref="/buyer/orders"
        backLabel="My orders"
      />

      {successMsg && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            color: '#166534',
            padding: '1rem 1.25rem',
            borderRadius: 8,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>✓</span>
            <span style={{ fontWeight: 600 }}>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="platform-detail-layout">
        <div>
          {/* Main Items Card */}
          <div className="platform-card" style={{ marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusBadge status={order.status} />{' '}
              <StatusBadge status={order.fulfillmentStatus} />{' '}
              <StatusBadge status={order.paymentStatus} />
            </p>
            <p className="platform-muted" style={{ fontSize: '0.875rem' }}>
              {fulfillmentTimelineText(order.fulfillmentStatus)}
            </p>

            <h3 style={{ marginTop: '1.25rem' }}>Line items</h3>
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
                        <Link href={`/marketplace/listings/${li.listingId}`}>{li.name}</Link>
                      </td>
                      <td>{li.sku ?? '—'}</td>
                      <td>{li.quantity}</td>
                      <td>{formatPrice(false, li.unitPriceInr)}</td>
                      <td>{formatPrice(false, li.lineTotalInr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: '1rem 0 0', fontWeight: 700, fontSize: '1.1rem' }}>
              Total: {formatPrice(false, order.totalInr)}
            </p>
          </div>

          {/* Payment Transactions Audit Log */}
          {order.transactions && order.transactions.length > 0 && (
            <div className="platform-card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.1rem' }}>
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
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>UTR: {tx.utrNumber}</span>
                          ) : tx.gatewayPaymentId ? (
                            <span style={{ fontFamily: 'monospace' }}>ID: {tx.gatewayPaymentId}</span>
                          ) : tx.gatewayOrderId ? (
                            <span style={{ fontFamily: 'monospace', color: '#64748b' }}>Order: {tx.gatewayOrderId}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{tx.paymentMethod ?? 'online'}</td>
                        <td>{formatPrice(false, tx.amountInr)}</td>
                        <td>
                          <StatusBadge status={tx.status} />
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
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

        <aside>
          {/* Payment Action Box */}
          <div
            className="platform-card"
            style={{
              marginBottom: '1.5rem',
              border: order.paymentStatus === 'PAID' ? '1px solid #86efac' : '2px solid #2f5233',
              background: order.paymentStatus === 'PAID' ? '#f0fdf4' : '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                Payment Status
              </span>
              <StatusBadge status={order.paymentStatus} />
            </div>

            {order.paymentStatus === 'PAID' ? (
              <div>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#166534', lineHeight: 1.5 }}>
                  ✓ Order settlement completed in full. The vendor has been notified to proceed with dispatch & fulfillment.
                </p>
              </div>
            ) : order.paymentStatus === 'PENDING' ? (
              <div style={{ marginTop: '0.75rem' }}>
                <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                  Payment of <strong>{formatPrice(false, order.totalInr)}</strong> is pending. You can pay instantly online or submit your corporate wire UTR reference:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="platform-btn platform-btn-cta platform-btn-full"
                    style={{ fontSize: '0.9rem', padding: '0.65rem' }}
                  >
                    ⚡ Pay Now Online (Razorpay)
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="platform-btn platform-btn-secondary platform-btn-full"
                    style={{ fontSize: '0.85rem', padding: '0.6rem' }}
                  >
                    🏦 Submit NEFT / RTGS Wire UTR
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBankDetails(!showBankDetails)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2f5233',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                      marginTop: '0.25rem',
                    }}
                  >
                    {showBankDetails ? 'Hide Escrow Bank Details ▲' : 'View Escrow Bank Details ▼'}
                  </button>

                  {showBankDetails && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        background: '#f8fafc',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        fontSize: '0.78rem',
                        lineHeight: 1.6,
                      }}
                    >
                      <div><strong>Bank:</strong> {ESCROW_BANK_DETAILS.bankName}</div>
                      <div><strong>A/C Name:</strong> {ESCROW_BANK_DETAILS.accountName}</div>
                      <div><strong>A/C No:</strong> <span style={{ fontFamily: 'monospace' }}>{ESCROW_BANK_DETAILS.accountNumber}</span></div>
                      <div><strong>IFSC:</strong> <span style={{ fontFamily: 'monospace' }}>{ESCROW_BANK_DETAILS.ifscCode}</span></div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="platform-muted" style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                Status: {order.paymentStatus}
              </p>
            )}
          </div>

          {/* Shipping & Business Dossier */}
          <div className="platform-card platform-prose">
            <h3 style={{ marginTop: 0 }}>Shipping & Contact</h3>
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
                <h3>GSTIN</h3>
                <p>{order.gstin}</p>
              </>
            )}
            {order.purchaseOrderNumber && (
              <>
                <h3>PO number</h3>
                <p>{order.purchaseOrderNumber}</p>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Payment Gateway Modal */}
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
