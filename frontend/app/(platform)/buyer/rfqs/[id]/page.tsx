'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { CATEGORY_LABELS, formatPrice } from '@/lib/platform/labels';
import type {
  CatalogCategory,
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  QuotationStatus,
  RfqStatus,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type RfqOrderInfo = {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  totalInr: string | number;
  quotationId?: string | null;
  placedAt: string;
};

type RfqDetail = {
  id: string;
  title: string;
  description: string;
  status: RfqStatus;
  category: CatalogCategory;
  quantity?: number | null;
  deadlineAt?: string | null;
  payloadCapacityKg?: string | number | null;
  enduranceMinutes?: number | null;
  isDgcaRequired?: boolean | null;
  targetBudgetInr?: string | number | null;
  specsDocumentUrl?: string | null;
  createdAt: string;
  _count: { invites: number; quotations: number };
  orders?: RfqOrderInfo[];
};

type QuotationRow = {
  id: string;
  priceOnRequest: boolean;
  priceInr?: string | null;
  minOrderQuantity?: number | null;
  leadTimeDays?: number | null;
  notes?: string | null;
  status: QuotationStatus;
  validUntil?: string | null;
  createdAt?: string;
  quotedPayloadKg?: string | number | null;
  quotedEnduranceMin?: number | null;
  dgcaModelNumber?: string | null;
  warrantyMonths?: number | null;
  vendorOrganization: {
    id: string;
    companyName: string;
    contactEmail: string;
    contactMobile: string;
    website?: string | null;
    city?: string | null;
    state?: string | null;
  };
};

export default function BuyerRfqDetailPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']}>
      <DetailInner />
    </RequireAuth>
  );
}

function DetailInner() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [rfq, setRfq] = useState<RfqDetail | null>(null);
  const [quotes, setQuotes] = useState<QuotationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');

  // Award Modal state
  const [awardingQuote, setAwardingQuote] = useState<QuotationRow | null>(null);
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  function load() {
    Promise.all([
      apiRequest<RfqDetail>(`/rfq/${id}`, { auth: true }),
      apiRequest<QuotationRow[]>(`/rfq/${id}/quotations`, { auth: true }),
    ])
      .then(([r, q]) => {
        setRfq(r);
        setQuotes(q);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load RFQ'),
      );
  }

  useEffect(() => {
    load();
  }, [id]);

  async function closeRfq() {
    try {
      await apiRequest(`/rfq/${id}/close`, { method: 'POST', auth: true });
      setMessage('RFQ closed successfully.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Close failed');
    }
  }

  async function cancelRfq() {
    try {
      await apiRequest(`/rfq/${id}/cancel`, { method: 'POST', auth: true });
      setMessage('RFQ cancelled.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cancel failed');
    }
  }

  async function handleAcceptQuotation() {
    if (!awardingQuote) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await apiRequest<{
        success: boolean;
        orderId: string;
        message: string;
      }>(`/rfq/${id}/quotations/${awardingQuote.id}/accept`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          purchaseOrderNumber: purchaseOrderNumber.trim() || undefined,
          notes: deliveryNotes.trim() || undefined,
        }),
      });

      setMessage(
        `Quotation accepted! Order #${res.orderId.slice(0, 8)} has been generated.`,
      );
      setAwardingQuote(null);
      load();
      // Navigate to order after brief pause
      router.push(`/buyer/orders/${res.orderId}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to accept quotation and create order',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectQuotation(quoteId: string) {
    if (!confirm('Are you sure you want to decline this quotation?')) return;
    setError(null);

    try {
      await apiRequest(`/rfq/${id}/quotations/${quoteId}/reject`, {
        method: 'POST',
        auth: true,
      });
      setMessage('Quotation marked as declined.');
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to decline quotation',
      );
    }
  }

  if (!rfq && !error) {
    return <p className="platform-muted">Loading RFQ details…</p>;
  }

  const generatedOrder = rfq?.orders && rfq.orders.length > 0 ? rfq.orders[0] : null;

  // Find lowest price and fastest delivery for comparison badges
  const validQuotes = quotes.filter((q) => !q.priceOnRequest && q.priceInr != null);
  const lowestPriceQuoteId =
    validQuotes.length > 1
      ? [...validQuotes].sort(
          (a, b) => Number(a.priceInr) - Number(b.priceInr),
        )[0]?.id
      : null;

  const validLeadTimeQuotes = quotes.filter((q) => q.leadTimeDays != null);
  const fastestDeliveryQuoteId =
    validLeadTimeQuotes.length > 1
      ? [...validLeadTimeQuotes].sort(
          (a, b) => Number(a.leadTimeDays) - Number(b.leadTimeDays),
        )[0]?.id
      : null;

  return (
    <>
      {error && <div className="platform-card platform-error">{error}</div>}
      {message && <div className="platform-card platform-success">{message}</div>}

      {/* Generated Order Banner */}
      {generatedOrder && (
        <div
          style={{
            background: '#f0fdf4',
            border: '2px solid #86efac',
            borderRadius: 12,
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🎉</span>
              <strong style={{ color: '#166534', fontSize: '1.1rem' }}>
                RFQ Awarded & Order Created!
              </strong>
              <StatusBadge status={generatedOrder.status} />
              <StatusBadge status={generatedOrder.paymentStatus} />
            </div>
            <p style={{ margin: 0, color: '#166534', fontSize: '0.9rem' }}>
              Order <strong>#{generatedOrder.id.slice(0, 8)}…</strong> for{' '}
              <strong>{formatPrice(false, generatedOrder.totalInr)}</strong> has been generated and is ready for payment settlement.
            </p>
          </div>
          <Link
            href={`/buyer/orders/${generatedOrder.id}`}
            className="platform-btn platform-btn-cta"
            style={{ textDecoration: 'none', padding: '0.65rem 1.25rem' }}
          >
            Go to Order & Pay Now →
          </Link>
        </div>
      )}

      {rfq && (
        <>
          <PlatformPageHeader
            breadcrumbs={[
              { label: 'My RFQs', href: '/buyer/rfqs' },
              { label: rfq.title },
            ]}
            title={rfq.title}
            subtitle={
              <>
                {CATEGORY_LABELS[rfq.category]} · {rfq._count.invites} invited vendors ·{' '}
                {rfq._count.quotations} submitted bids
                {rfq.deadlineAt && (
                  <> · Deadline: {new Date(rfq.deadlineAt).toLocaleDateString('en-IN')}</>
                )}
              </>
            }
            badge={<StatusBadge status={rfq.status} />}
          />

          {/* Technical Specs Dossier Card */}
          <div className="platform-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.1rem' }}>
              Procurement Scope & Technical Requirements
            </h3>
            <p style={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.6, margin: '0 0 1rem' }}>
              {rfq.description}
            </p>

            {/* Technical Highlights Badges */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Required Quantity</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {rfq.quantity != null ? `${rfq.quantity} units` : 'Not specified'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Min. Payload Capacity</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {rfq.payloadCapacityKg ? `${Number(rfq.payloadCapacityKg)} kg` : 'Standard'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Min. Flight Endurance</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {rfq.enduranceMinutes ? `${rfq.enduranceMinutes} mins` : 'Standard'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>DGCA Type Certification</span>
                <div
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    marginTop: 2,
                    color: rfq.isDgcaRequired ? '#166534' : '#64748b',
                  }}
                >
                  {rfq.isDgcaRequired ? '✓ Mandatory' : 'Optional'}
                </div>
              </div>

              {rfq.targetBudgetInr && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Target Budget</span>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    {formatPrice(false, rfq.targetBudgetInr)}
                  </div>
                </div>
              )}
            </div>

            {rfq.specsDocumentUrl && (
              <div style={{ marginTop: '0.75rem' }}>
                <a
                  href={rfq.specsDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="platform-btn platform-btn-secondary platform-btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                >
                  📄 View Attached Tender Document / Specs ↗
                </a>
              </div>
            )}

            {rfq.status === 'OPEN' && (
              <div className="platform-actions" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="platform-btn platform-btn-secondary"
                  onClick={closeRfq}
                >
                  Close RFQ
                </button>
                <button
                  type="button"
                  className="platform-btn platform-btn-danger"
                  onClick={cancelRfq}
                >
                  Cancel RFQ
                </button>
              </div>
            )}
          </div>

          {/* Quotations Header with View Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '2rem 0 1rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.35rem', margin: 0 }}>
                Vendor Proposals & Quotations ({quotes.length})
              </h2>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Evaluate technical specs, compare commercial terms, and award directly to trigger order fulfillment.
              </p>
            </div>

            {quotes.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
                <button
                  type="button"
                  onClick={() => setViewMode('matrix')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: 6,
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    background: viewMode === 'matrix' ? '#ffffff' : 'transparent',
                    color: viewMode === 'matrix' ? '#0f172a' : '#64748b',
                    boxShadow: viewMode === 'matrix' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  📊 Comparison Matrix
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: 6,
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                    color: viewMode === 'cards' ? '#0f172a' : '#64748b',
                    boxShadow: viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  🗂️ Cards View
                </button>
              </div>
            )}
          </div>

          {/* VIEW 1: COMPARISON MATRIX TABLE */}
          {viewMode === 'matrix' && quotes.length > 0 && (
            <div className="platform-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div className="platform-table-wrap">
                <table className="platform-table">
                  <thead>
                    <tr>
                      <th>Vendor Organization</th>
                      <th>Quoted Price (Unit)</th>
                      <th>Total Value</th>
                      <th>Lead Time</th>
                      <th>Offered Payload</th>
                      <th>Endurance</th>
                      <th>DGCA Type Certified</th>
                      <th>Warranty</th>
                      <th>Status & Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => {
                      const isAccepted = q.status === 'ACCEPTED';
                      const isRejected = q.status === 'REJECTED';
                      const isSubmitted = q.status === 'SUBMITTED';
                      const isLowest = q.id === lowestPriceQuoteId;
                      const isFastest = q.id === fastestDeliveryQuoteId;

                      const unitPriceNum = q.priceInr ? Number(q.priceInr) : 0;
                      const qtyNum = rfq.quantity && rfq.quantity > 0 ? rfq.quantity : 1;
                      const totalVal = unitPriceNum * qtyNum;

                      return (
                        <tr
                          key={q.id}
                          style={{
                            background: isAccepted
                              ? '#f0fdf4'
                              : isRejected
                              ? '#f8fafc'
                              : isLowest
                              ? '#fefce8'
                              : '#ffffff',
                          }}
                        >
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              {q.vendorOrganization.companyName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                              {[q.vendorOrganization.city, q.vendorOrganization.state].filter(Boolean).join(', ') || 'India'}
                            </div>
                          </td>

                          <td>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                              {formatPrice(q.priceOnRequest, q.priceInr)}
                            </div>
                            {isLowest && (
                              <span
                                style={{
                                  fontSize: '0.675rem',
                                  fontWeight: 700,
                                  background: '#dcfce7',
                                  color: '#166534',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  display: 'inline-block',
                                  marginTop: 2,
                                }}
                              >
                                🏷️ Lowest Price
                              </span>
                            )}
                          </td>

                          <td style={{ fontWeight: 600 }}>
                            {q.priceOnRequest ? '—' : `₹${totalVal.toLocaleString('en-IN')}`}
                          </td>

                          <td>
                            <div style={{ fontWeight: 600 }}>
                              {q.leadTimeDays != null ? `${q.leadTimeDays} days` : '—'}
                            </div>
                            {isFastest && (
                              <span
                                style={{
                                  fontSize: '0.675rem',
                                  fontWeight: 700,
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  display: 'inline-block',
                                  marginTop: 2,
                                }}
                              >
                                ⚡ Fastest
                              </span>
                            )}
                          </td>

                          <td>
                            {q.quotedPayloadKg != null ? (
                              <strong>{Number(q.quotedPayloadKg)} kg</strong>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>

                          <td>
                            {q.quotedEnduranceMin != null ? (
                              <strong>{q.quotedEnduranceMin} mins</strong>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>

                          <td>
                            {q.dgcaModelNumber ? (
                              <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.8rem' }}>
                                ✓ {q.dgcaModelNumber}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Uncertified / Standard</span>
                            )}
                          </td>

                          <td>
                            {q.warrantyMonths != null ? `${q.warrantyMonths} mos` : 'Standard'}
                          </td>

                          <td>
                            {isAccepted ? (
                              <div>
                                <span style={{ color: '#166534', fontWeight: 700, fontSize: '0.825rem' }}>
                                  ✓ Awarded
                                </span>
                                {generatedOrder && (
                                  <Link
                                    href={`/buyer/orders/${generatedOrder.id}`}
                                    style={{ display: 'block', fontSize: '0.75rem', color: '#2f5233', fontWeight: 600, textDecoration: 'underline' }}
                                  >
                                    View Order #{generatedOrder.id.slice(0, 8)} ↗
                                  </Link>
                                )}
                              </div>
                            ) : isRejected ? (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Declined</span>
                            ) : rfq.status === 'OPEN' && isSubmitted ? (
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                  type="button"
                                  className="platform-btn platform-btn-cta platform-btn-sm"
                                  disabled={q.priceOnRequest || !q.priceInr}
                                  onClick={() => {
                                    setAwardingQuote(q);
                                    setPurchaseOrderNumber(`PO-RFQ-${rfq.id.slice(0, 8).toUpperCase()}`);
                                  }}
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                                >
                                  Award RFQ
                                </button>
                                <button
                                  type="button"
                                  className="platform-btn platform-btn-secondary platform-btn-sm"
                                  onClick={() => handleRejectQuotation(q.id)}
                                  style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <StatusBadge status={q.status} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: CARDS GRID VIEW */}
          {viewMode === 'cards' && (
            <div className="platform-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {quotes.map((q) => {
                const isAccepted = q.status === 'ACCEPTED';
                const isRejected = q.status === 'REJECTED';
                const isSubmitted = q.status === 'SUBMITTED';

                const unitPriceNum = q.priceInr ? Number(q.priceInr) : 0;
                const qtyNum = rfq.quantity && rfq.quantity > 0 ? rfq.quantity : 1;
                const calculatedTotal = unitPriceNum * qtyNum;

                return (
                  <article
                    key={q.id}
                    className="platform-card"
                    style={{
                      border: isAccepted ? '2px solid #22c55e' : isRejected ? '1px dashed #cbd5e1' : '1px solid #e2e8f0',
                      background: isAccepted ? '#f0fdf4' : isRejected ? '#f8fafc' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
                          {q.vendorOrganization.companyName}
                        </h3>
                        <StatusBadge status={q.status} />
                      </div>

                      <div style={{ marginBottom: '1rem', padding: '0.75rem', background: isAccepted ? '#dcfce7' : '#f1f5f9', borderRadius: 8 }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                          {formatPrice(q.priceOnRequest, q.priceInr)}
                          {!q.priceOnRequest && (
                            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}> / unit</span>
                          )}
                        </div>
                        {!q.priceOnRequest && qtyNum > 1 && (
                          <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem' }}>
                            Total for {qtyNum} units: <strong>₹{calculatedTotal.toLocaleString('en-IN')}</strong>
                          </div>
                        )}
                      </div>

                      {/* Technical Specs on Card */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.5rem',
                          background: '#f8fafc',
                          padding: '0.65rem',
                          borderRadius: 6,
                          marginBottom: '0.75rem',
                          fontSize: '0.8rem',
                        }}
                      >
                        <div>
                          <span style={{ color: '#64748b' }}>Payload:</span>{' '}
                          <strong>{q.quotedPayloadKg ? `${Number(q.quotedPayloadKg)} kg` : '—'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Endurance:</span>{' '}
                          <strong>{q.quotedEnduranceMin ? `${q.quotedEnduranceMin}m` : '—'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>DGCA:</span>{' '}
                          <strong style={{ color: q.dgcaModelNumber ? '#166534' : '#64748b' }}>
                            {q.dgcaModelNumber ? '✓ Certified' : 'Standard'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Warranty:</span>{' '}
                          <strong>{q.warrantyMonths ? `${q.warrantyMonths} mo` : 'Standard'}</strong>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.875rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                        {q.leadTimeDays != null && (
                          <div>
                            <strong>Lead Time:</strong> {q.leadTimeDays} business days
                          </div>
                        )}
                        {q.minOrderQuantity != null && (
                          <div>
                            <strong>Min Order Qty:</strong> {q.minOrderQuantity} units
                          </div>
                        )}
                      {q.notes && (
                        <div style={{ marginTop: '0.5rem', fontStyle: 'italic', color: '#475569', whiteSpace: 'pre-wrap' }}>
                          &ldquo;{q.notes}&rdquo;
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                      <div>📧 {q.vendorOrganization.contactEmail}</div>
                      <div>📞 {q.vendorOrganization.contactMobile}</div>
                      {q.vendorOrganization.city && (
                        <div>📍 {q.vendorOrganization.city}, {q.vendorOrganization.state}</div>
                      )}
                      {q.vendorOrganization.website && (
                        <div style={{ marginTop: '0.25rem' }}>
                          🌐 <a href={q.vendorOrganization.website} target="_blank" rel="noreferrer" style={{ color: '#2f5233' }}>
                            {q.vendorOrganization.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons based on status */}
                  <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                    {isAccepted ? (
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ color: '#166534', fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                          ✓ Winning Quote Awarded
                        </span>
                        {generatedOrder && (
                          <Link
                            href={`/buyer/orders/${generatedOrder.id}`}
                            className="platform-btn platform-btn-cta platform-btn-full"
                            style={{ textDecoration: 'none', display: 'block', padding: '0.6rem' }}
                          >
                            View Order #{generatedOrder.id.slice(0, 8)} →
                          </Link>
                        )}
                      </div>
                    ) : isRejected ? (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
                        Quotation declined
                      </p>
                    ) : rfq.status === 'OPEN' && isSubmitted ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="platform-btn platform-btn-cta"
                          style={{ flex: 2, padding: '0.65rem' }}
                          disabled={q.priceOnRequest || !q.priceInr}
                          onClick={() => {
                            setAwardingQuote(q);
                            setPurchaseOrderNumber(`PO-RFQ-${rfq.id.slice(0, 8).toUpperCase()}`);
                          }}
                        >
                          🏆 Award & Order
                        </button>
                        <button
                          type="button"
                          className="platform-btn platform-btn-secondary"
                          style={{ flex: 1, padding: '0.65rem' }}
                          onClick={() => handleRejectQuotation(q.id)}
                        >
                          Decline
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}

          {quotes.length === 0 && (
            <div className="platform-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <p style={{ fontSize: '1.1rem', color: '#64748b', margin: '0 0 0.5rem' }}>
                No vendor quotations submitted yet.
              </p>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
                Verified drone manufacturers in this category have been notified and will submit bids shortly.
              </p>
            </div>
          )}
        </>
      )}

      {/* Award & Order Confirmation Modal */}
      {awardingQuote && rfq && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="platform-card"
            style={{
              maxWidth: 520,
              width: '100%',
              background: '#ffffff',
              borderRadius: 12,
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                Award RFQ & Generate Order
              </h3>
              <button
                type="button"
                onClick={() => setAwardingQuote(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              You are awarding this requirement to <strong>{awardingQuote.vendorOrganization.companyName}</strong>.
              This will automatically close the RFQ, mark other bids as declined, and create an official Purchase Order in your account.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Item / Requirement:</span>
                <span style={{ fontWeight: 600 }}>{rfq.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Quantity:</span>
                <span style={{ fontWeight: 600 }}>{rfq.quantity || 1} units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Quoted Unit Price:</span>
                <span style={{ fontWeight: 600 }}>{formatPrice(false, awardingQuote.priceInr)}</span>
              </div>
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                <span>Order Total:</span>
                <span style={{ color: '#166534' }}>
                  ₹{((Number(awardingQuote.priceInr) || 0) * (rfq.quantity || 1)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Purchase Order (PO) Number (Optional)
                </label>
                <input
                  type="text"
                  value={purchaseOrderNumber}
                  onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                  className="platform-input"
                  placeholder="e.g. PO-CORP-2026-0042"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Special Instructions / Delivery Notes (Optional)
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="platform-input"
                  rows={2}
                  placeholder="e.g. Dispatch to warehouse dock B; contact facility manager before delivery"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="platform-btn platform-btn-secondary"
                onClick={() => setAwardingQuote(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="platform-btn platform-btn-cta"
                onClick={handleAcceptQuotation}
                disabled={actionLoading}
              >
                {actionLoading ? 'Creating Order…' : 'Confirm Award & Create Order →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
