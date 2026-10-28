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

function quoteTableRowClass(
  isAccepted: boolean,
  isRejected: boolean,
  isLowest: boolean,
): string {
  if (isAccepted) return 'platform-table-row--accepted';
  if (isRejected) return 'platform-table-row--rejected';
  if (isLowest) return 'platform-table-row--best-price';
  return '';
}

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

      {generatedOrder && (
        <div className="platform-banner-success">
          <div>
            <div className="platform-banner-success__head">
              <span aria-hidden>🎉</span>
              <strong>RFQ Awarded & Order Created!</strong>
              <StatusBadge status={generatedOrder.status} />
              <StatusBadge status={generatedOrder.paymentStatus} />
            </div>
            <p className="platform-banner-success__text">
              Order <strong>#{generatedOrder.id.slice(0, 8)}…</strong> for{' '}
              <strong>{formatPrice(false, generatedOrder.totalInr)}</strong> has been generated and is ready for payment settlement.
            </p>
          </div>
          <Link
            href={`/buyer/orders/${generatedOrder.id}`}
            className="platform-btn platform-btn-cta"
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

          <div className="platform-card platform-card--lg">
            <h3 className="platform-section-heading">
              Procurement Scope & Technical Requirements
            </h3>
            <p className="platform-pre-wrap">{rfq.description}</p>

            <div className="platform-stat-grid platform-stat-grid--specs">
              <div>
                <span className="platform-stat-spec-label">Required Quantity</span>
                <div className="platform-stat-spec-value">
                  {rfq.quantity != null ? `${rfq.quantity} units` : 'Not specified'}
                </div>
              </div>

              <div>
                <span className="platform-stat-spec-label">Min. Payload Capacity</span>
                <div className="platform-stat-spec-value">
                  {rfq.payloadCapacityKg ? `${Number(rfq.payloadCapacityKg)} kg` : 'Standard'}
                </div>
              </div>

              <div>
                <span className="platform-stat-spec-label">Min. Flight Endurance</span>
                <div className="platform-stat-spec-value">
                  {rfq.enduranceMinutes ? `${rfq.enduranceMinutes} mins` : 'Standard'}
                </div>
              </div>

              <div>
                <span className="platform-stat-spec-label">DGCA Type Certification</span>
                <div
                  className={`platform-stat-spec-value ${
                    rfq.isDgcaRequired ? 'platform-stat-spec-value--success' : ''
                  }`}
                >
                  {rfq.isDgcaRequired ? '✓ Mandatory' : 'Optional'}
                </div>
              </div>

              {rfq.targetBudgetInr && (
                <div>
                  <span className="platform-stat-spec-label">Target Budget</span>
                  <div className="platform-stat-spec-value">
                    {formatPrice(false, rfq.targetBudgetInr)}
                  </div>
                </div>
              )}
            </div>

            {rfq.specsDocumentUrl && (
              <div className="platform-mt-sm">
                <a
                  href={rfq.specsDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="platform-btn platform-btn-secondary platform-btn-sm"
                >
                  📄 View Attached Tender Document / Specs ↗
                </a>
              </div>
            )}

            {rfq.status === 'OPEN' && (
              <div className="platform-actions platform-mt-md">
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

          <div className="platform-section-header">
            <div>
              <h2 className="platform-section-heading platform-section-heading--lg">
                Vendor Proposals & Quotations ({quotes.length})
              </h2>
              <p className="platform-section-header__desc">
                Evaluate technical specs, compare commercial terms, and award directly to trigger order fulfillment.
              </p>
            </div>

            {quotes.length > 0 && (
              <div className="platform-segmented" role="tablist" aria-label="Quotation view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'matrix'}
                  onClick={() => setViewMode('matrix')}
                  className={`platform-segmented-btn ${
                    viewMode === 'matrix' ? 'platform-segmented-btn--active' : ''
                  }`}
                >
                  📊 Comparison Matrix
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'cards'}
                  onClick={() => setViewMode('cards')}
                  className={`platform-segmented-btn ${
                    viewMode === 'cards' ? 'platform-segmented-btn--active' : ''
                  }`}
                >
                  🗂️ Cards View
                </button>
              </div>
            )}
          </div>

          {viewMode === 'matrix' && quotes.length > 0 && (
            <div className="platform-card platform-card--flush">
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
                          className={quoteTableRowClass(isAccepted, isRejected, isLowest)}
                        >
                          <td>
                            <div className="platform-stat-spec-value">{q.vendorOrganization.companyName}</div>
                            <div className="platform-text-muted-sm">
                              {[q.vendorOrganization.city, q.vendorOrganization.state].filter(Boolean).join(', ') || 'India'}
                            </div>
                          </td>

                          <td>
                            <div className="platform-stat-spec-value">{formatPrice(q.priceOnRequest, q.priceInr)}</div>
                            {isLowest && (
                              <span className="platform-badge-pill platform-badge-pill--success">
                                🏷️ Lowest Price
                              </span>
                            )}
                          </td>

                          <td className="platform-stat-spec-value">
                            {q.priceOnRequest ? '—' : `₹${totalVal.toLocaleString('en-IN')}`}
                          </td>

                          <td>
                            <div className="platform-stat-spec-value">
                              {q.leadTimeDays != null ? `${q.leadTimeDays} days` : '—'}
                            </div>
                            {isFastest && (
                              <span className="platform-badge-pill platform-badge-pill--info">
                                ⚡ Fastest
                              </span>
                            )}
                          </td>

                          <td>
                            {q.quotedPayloadKg != null ? (
                              <strong>{Number(q.quotedPayloadKg)} kg</strong>
                            ) : (
                              <span className="platform-text-faint">—</span>
                            )}
                          </td>

                          <td>
                            {q.quotedEnduranceMin != null ? (
                              <strong>{q.quotedEnduranceMin} mins</strong>
                            ) : (
                              <span className="platform-text-faint">—</span>
                            )}
                          </td>

                          <td>
                            {q.dgcaModelNumber ? (
                              <span className="platform-text-success platform-text-success--sm">
                                ✓ {q.dgcaModelNumber}
                              </span>
                            ) : (
                              <span className="platform-text-faint platform-text-success--sm">Uncertified / Standard</span>
                            )}
                          </td>

                          <td>
                            {q.warrantyMonths != null ? `${q.warrantyMonths} mos` : 'Standard'}
                          </td>

                          <td>
                            {isAccepted ? (
                              <div>
                                <span className="platform-text-success platform-text-success--sm">
                                  ✓ Awarded
                                </span>
                                {generatedOrder && (
                                  <Link
                                    href={`/buyer/orders/${generatedOrder.id}`}
                                    className="platform-inline-link"
                                  >
                                    View Order #{generatedOrder.id.slice(0, 8)} ↗
                                  </Link>
                                )}
                              </div>
                            ) : isRejected ? (
                              <span className="platform-text-faint platform-text-success--sm">Declined</span>
                            ) : rfq.status === 'OPEN' && isSubmitted ? (
                              <div className="platform-table-actions">
                                <button
                                  type="button"
                                  className="platform-btn platform-btn-cta platform-btn-sm"
                                  disabled={q.priceOnRequest || !q.priceInr}
                                  onClick={() => {
                                    setAwardingQuote(q);
                                    setPurchaseOrderNumber(`PO-RFQ-${rfq.id.slice(0, 8).toUpperCase()}`);
                                  }}
                                >
                                  Award RFQ
                                </button>
                                <button
                                  type="button"
                                  className="platform-btn platform-btn-secondary platform-btn-sm"
                                  onClick={() => handleRejectQuotation(q.id)}
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

          {viewMode === 'cards' && (
            <div className="platform-grid platform-grid--quote-cards">
              {quotes.map((q) => {
                const isAccepted = q.status === 'ACCEPTED';
                const isRejected = q.status === 'REJECTED';
                const isSubmitted = q.status === 'SUBMITTED';

                const unitPriceNum = q.priceInr ? Number(q.priceInr) : 0;
                const qtyNum = rfq.quantity && rfq.quantity > 0 ? rfq.quantity : 1;
                const calculatedTotal = unitPriceNum * qtyNum;

                const cardClass = isAccepted
                  ? 'platform-quote-card--accepted'
                  : isRejected
                    ? 'platform-quote-card--rejected'
                    : '';

                return (
                  <article
                    key={q.id}
                    className={`platform-card platform-quote-card ${cardClass}`}
                  >
                    <div>
                      <div className="platform-quote-card__head">
                        <h3 className="platform-section-heading">{q.vendorOrganization.companyName}</h3>
                        <StatusBadge status={q.status} />
                      </div>

                      <div
                        className={`platform-quote-price-box ${
                          isAccepted ? 'platform-quote-price-box--accepted' : ''
                        }`}
                      >
                        <div className="platform-quote-price-main">
                          {formatPrice(q.priceOnRequest, q.priceInr)}
                          {!q.priceOnRequest && (
                            <span className="platform-quote-price-unit"> / unit</span>
                          )}
                        </div>
                        {!q.priceOnRequest && qtyNum > 1 && (
                          <div className="platform-muted">
                            Total for {qtyNum} units: <strong>₹{calculatedTotal.toLocaleString('en-IN')}</strong>
                          </div>
                        )}
                      </div>

                      <div className="platform-quote-spec-grid">
                        <div>
                          <span className="platform-muted">Payload:</span>{' '}
                          <strong>{q.quotedPayloadKg ? `${Number(q.quotedPayloadKg)} kg` : '—'}</strong>
                        </div>
                        <div>
                          <span className="platform-muted">Endurance:</span>{' '}
                          <strong>{q.quotedEnduranceMin ? `${q.quotedEnduranceMin}m` : '—'}</strong>
                        </div>
                        <div>
                          <span className="platform-muted">DGCA:</span>{' '}
                          <strong className={q.dgcaModelNumber ? 'platform-text-success' : 'platform-muted'}>
                            {q.dgcaModelNumber ? '✓ Certified' : 'Standard'}
                          </strong>
                        </div>
                        <div>
                          <span className="platform-muted">Warranty:</span>{' '}
                          <strong>{q.warrantyMonths ? `${q.warrantyMonths} mo` : 'Standard'}</strong>
                        </div>
                      </div>

                      <div className="platform-quote-meta">
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
                          <div className="platform-quote-notes">&ldquo;{q.notes}&rdquo;</div>
                        )}
                      </div>

                      <div className="platform-quote-vendor-footer">
                        <div>📧 {q.vendorOrganization.contactEmail}</div>
                        <div>📞 {q.vendorOrganization.contactMobile}</div>
                        {q.vendorOrganization.city && (
                          <div>📍 {q.vendorOrganization.city}, {q.vendorOrganization.state}</div>
                        )}
                        {q.vendorOrganization.website && (
                          <div className="platform-mt-sm">
                            🌐{' '}
                            <a
                              href={q.vendorOrganization.website}
                              target="_blank"
                              rel="noreferrer"
                              className="platform-inline-link"
                            >
                              {q.vendorOrganization.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="platform-quote-actions">
                      {isAccepted ? (
                        <div className="platform-empty-state-card">
                          <span className="platform-text-success platform-text-success--sm">
                            ✓ Winning Quote Awarded
                          </span>
                          {generatedOrder && (
                            <Link
                              href={`/buyer/orders/${generatedOrder.id}`}
                              className="platform-btn platform-btn-cta platform-btn-full platform-mt-sm"
                            >
                              View Order #{generatedOrder.id.slice(0, 8)} →
                            </Link>
                          )}
                        </div>
                      ) : isRejected ? (
                        <p className="platform-empty-state-card__desc platform-text-faint">
                          Quotation declined
                        </p>
                      ) : rfq.status === 'OPEN' && isSubmitted ? (
                        <div className="platform-quote-actions-row">
                          <button
                            type="button"
                            className="platform-btn platform-btn-cta"
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
            <div className="platform-card platform-empty-state-card">
              <p className="platform-empty-state-card__title">
                No vendor quotations submitted yet.
              </p>
              <p className="platform-empty-state-card__desc">
                Verified drone manufacturers in this category have been notified and will submit bids shortly.
              </p>
            </div>
          )}
        </>
      )}

      {awardingQuote && rfq && (
        <div className="platform-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="award-modal-title">
          <div className="platform-card platform-modal-dialog">
            <div className="platform-modal-header">
              <h3 id="award-modal-title" className="platform-section-heading">
                Award RFQ & Generate Order
              </h3>
              <button
                type="button"
                className="platform-modal-close"
                onClick={() => setAwardingQuote(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="platform-muted">
              You are awarding this requirement to <strong>{awardingQuote.vendorOrganization.companyName}</strong>.
              This will automatically close the RFQ, mark other bids as declined, and create an official Purchase Order in your account.
            </p>

            <div className="platform-summary-panel">
              <div className="platform-summary-row">
                <span>Item / Requirement:</span>
                <span>{rfq.title}</span>
              </div>
              <div className="platform-summary-row">
                <span>Quantity:</span>
                <span>{rfq.quantity || 1} units</span>
              </div>
              <div className="platform-summary-row">
                <span>Quoted Unit Price:</span>
                <span>{formatPrice(false, awardingQuote.priceInr)}</span>
              </div>
              <div className="platform-summary-total">
                <span>Order Total:</span>
                <span className="platform-text-success">
                  ₹{((Number(awardingQuote.priceInr) || 0) * (rfq.quantity || 1)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="platform-stack platform-stack--lg">
              <div className="platform-field">
                <label htmlFor="po-number">Purchase Order (PO) Number (Optional)</label>
                <input
                  id="po-number"
                  type="text"
                  value={purchaseOrderNumber}
                  onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                  className="platform-input"
                  placeholder="e.g. PO-CORP-2026-0042"
                />
              </div>

              <div className="platform-field">
                <label htmlFor="delivery-notes">Special Instructions / Delivery Notes (Optional)</label>
                <textarea
                  id="delivery-notes"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="platform-input"
                  rows={2}
                  placeholder="e.g. Dispatch to warehouse dock B; contact facility manager before delivery"
                />
              </div>
            </div>

            <div className="platform-confirm-actions platform-mt-md">
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
