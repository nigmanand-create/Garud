'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { useConfirmDialog } from '@/components/platform/ConfirmDialog';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { CATEGORY_LABELS, formatEnumLabel, formatPrice } from '@/lib/platform/labels';
import type {
  PartnerQuotation,
  PartnerRfqInviteDetail,
  PartnerRfqInviteListItem,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

async function loadPartnerRfqDetail(rfqId: string): Promise<{
  invite: PartnerRfqInviteDetail;
  quotation: PartnerQuotation | null;
}> {
  const invite = await apiRequest<PartnerRfqInviteDetail>(
    `/partner/rfqs/${rfqId}`,
    { auth: true },
  );
  let quotation: PartnerQuotation | null = null;
  if (invite.status === 'QUOTED') {
    const list = await apiRequest<PartnerRfqInviteListItem[]>('/partner/rfqs', {
      auth: true,
    });
    const match = list.find((row) => row.rfq.id === rfqId);
    quotation = match?.rfq.quotations?.[0] ?? null;
  }
  return { invite, quotation };
}

export default function PartnerRfqDetailPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <DetailInner />
    </RequireAuth>
  );
}

function QuotationSummary({ quotation }: { quotation: PartnerQuotation }) {
  const isAccepted = quotation.status === 'ACCEPTED';
  const isRejected = quotation.status === 'REJECTED';

  return (
    <div
      className="platform-card platform-form-card"
      style={{
        border: isAccepted ? '2px solid #22c55e' : isRejected ? '1px dashed #cbd5e1' : undefined,
        background: isAccepted ? '#f0fdf4' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 className="platform-card-section-title" style={{ margin: 0 }}>Your quotation</h3>
        {quotation.status && <StatusBadge status={quotation.status} />}
      </div>

      <p className="platform-detail-fact">
        <span className="platform-detail-fact-label">Price:</span>{' '}
        {quotation.priceOnRequest
          ? 'Price on request'
          : formatPrice(false, quotation.priceInr)}
      </p>
      {quotation.leadTimeDays != null && (
        <p className="platform-detail-fact">
          <span className="platform-detail-fact-label">Lead time:</span>{' '}
          {quotation.leadTimeDays} days
        </p>
      )}
      {quotation.quotedPayloadKg != null && (
        <p className="platform-detail-fact">
          <span className="platform-detail-fact-label">Quoted Payload:</span>{' '}
          <strong>{Number(quotation.quotedPayloadKg)} kg</strong>
        </p>
      )}
      {quotation.quotedEnduranceMin != null && (
        <p className="platform-detail-fact">
          <span className="platform-detail-fact-label">Quoted Endurance:</span>{' '}
          <strong>{quotation.quotedEnduranceMin} mins</strong>
        </p>
      )}
      {quotation.dgcaModelNumber && (
        <p className="platform-detail-fact">
          <span className="platform-detail-fact-label">DGCA Certification:</span>{' '}
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#166534' }}>
            ✓ {quotation.dgcaModelNumber}
          </span>
        </p>
      )}
      {quotation.warrantyMonths != null && (
        <p className="platform-detail-fact">
          <span className="platform-detail-fact-label">Warranty:</span>{' '}
          {quotation.warrantyMonths} months
        </p>
      )}
      {quotation.notes && (
        <p className="platform-detail-fact" style={{ whiteSpace: 'pre-wrap' }}>
          <span className="platform-detail-fact-label">Notes:</span>{' '}
          {quotation.notes}
        </p>
      )}

      {isAccepted && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '1rem', borderRadius: 8, marginTop: '1rem' }}>
          <strong style={{ color: '#166534', display: 'block', fontSize: '1rem', marginBottom: '0.25rem' }}>
            🎉 Quotation Awarded!
          </strong>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#166534' }}>
            Congratulations! The buyer accepted your quotation and a Purchase Order has been placed with your organization.
          </p>
          <Link
            href="/partner/orders"
            className="platform-btn platform-btn-cta platform-btn-sm"
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            View Incoming Orders →
          </Link>
        </div>
      )}

      {isRejected && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: 8, marginTop: '1rem' }}>
          <span style={{ color: '#991b1b', fontSize: '0.875rem' }}>
            This quotation was not awarded by the buyer.
          </span>
        </div>
      )}

      {!isAccepted && !isRejected && (
        <p className="platform-muted platform-detail-fact">
          Submitted — the buyer is reviewing bids and will award the contract.
        </p>
      )}
    </div>
  );
}

function DetailInner() {
  const params = useParams();
  const id = params.id as string;
  const [invite, setInvite] = useState<PartnerRfqInviteDetail | null>(null);
  const [submittedQuotation, setSubmittedQuotation] =
    useState<PartnerQuotation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [quote, setQuote] = useState({
    priceOnRequest: false,
    priceInr: '',
    leadTimeDays: '',
    notes: '',
    quotedPayloadKg: '',
    quotedEnduranceMin: '',
    dgcaModelNumber: '',
    warrantyMonths: '',
  });

  const reload = useCallback(() => {
    return loadPartnerRfqDetail(id)
      .then(({ invite: inv, quotation }) => {
        setInvite(inv);
        setSubmittedQuotation(quotation);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'RFQ not found'),
      );
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function submitQuote(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const created = await apiRequest<PartnerQuotation>(
        `/partner/rfqs/${id}/quotations`,
        {
          method: 'POST',
          auth: true,
          body: {
            priceOnRequest: quote.priceOnRequest,
            priceInr: quote.priceOnRequest ? undefined : Number(quote.priceInr),
            leadTimeDays: quote.leadTimeDays
              ? Number(quote.leadTimeDays)
              : undefined,
            notes: quote.notes || undefined,
            quotedPayloadKg: quote.quotedPayloadKg
              ? Number(quote.quotedPayloadKg)
              : undefined,
            quotedEnduranceMin: quote.quotedEnduranceMin
              ? Number(quote.quotedEnduranceMin)
              : undefined,
            dgcaModelNumber: quote.dgcaModelNumber.trim() || undefined,
            warrantyMonths: quote.warrantyMonths
              ? Number(quote.warrantyMonths)
              : undefined,
          },
        },
      );
      setSubmittedQuotation(created);
      const { invite: refreshed, quotation } = await loadPartnerRfqDetail(id);
      setInvite(refreshed);
      if (quotation) setSubmittedQuotation(quotation);
      setMessage('Quotation submitted.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function decline() {
    const ok = await confirm({
      title: 'Decline this RFQ invite?',
      message: 'You will not be able to submit a quotation for this requirement after declining.',
      confirmLabel: 'Decline RFQ',
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    setMessage(null);
    setDeclining(true);
    try {
      await apiRequest(`/partner/rfqs/${id}/decline`, {
        method: 'POST',
        auth: true,
      });
      setMessage('Invite declined.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Decline failed');
    } finally {
      setDeclining(false);
    }
  }

  const canRespond =
    invite &&
    invite.rfq.status === 'OPEN' &&
    invite.status !== 'DECLINED' &&
    invite.status !== 'QUOTED';

  const showQuotationSummary =
    invite &&
    (invite.status === 'QUOTED' || submittedQuotation) &&
    invite.status !== 'DECLINED';

  if (!invite && !error) {
    return (
      <PartnerPageShell>
        <PlatformPageHeader
          breadcrumbs={[
            { label: 'RFQ inbox', href: '/partner/rfqs' },
            { label: 'Loading…' },
          ]}
          title="RFQ details"
          subtitle="Loading buyer requirement…"
        />
        <PlatformLoading label="Loading RFQ…" />
      </PartnerPageShell>
    );
  }

  return (
    <PartnerPageShell>
      {confirmDialog}
      <div className="platform-partner-form-page">
        {!invite && error && (
          <PlatformPageHeader
            breadcrumbs={[{ label: 'RFQ inbox', href: '/partner/rfqs' }]}
            title="RFQ not found"
            subtitle="This invite may have been removed or you may not have access."
          />
        )}
        {error && (
          <div className="platform-card platform-error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="platform-card platform-success" role="status">
            {message}
          </div>
        )}
        {invite && (
          <div className="platform-detail-layout platform-form-layout--full">
            <div>
              <PlatformPageHeader
              breadcrumbs={[
                { label: 'RFQ inbox', href: '/partner/rfqs' },
                { label: invite.rfq.title },
              ]}
              title={invite.rfq.title}
              subtitle={
                <>
                  {CATEGORY_LABELS[invite.rfq.category]} · Invite{' '}
                  {formatEnumLabel(invite.status)}
                </>
              }
              badge={<StatusBadge status={invite.rfq.status} />}
            />
              <div className="platform-card platform-prose">
                <h3>Requirement</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{invite.rfq.description}</p>
                {invite.rfq.quantity != null && (
                  <p className="platform-detail-fact">
                    <span className="platform-detail-fact-label">Quantity:</span>{' '}
                    <strong>{invite.rfq.quantity} units</strong>
                  </p>
                )}
              </div>

              {/* Technical RFP Specifications */}
              <div
                className="platform-card"
                style={{
                  marginTop: '1rem',
                  border: '1px solid #bfdbfe',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🛸</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e3a8a' }}>
                    Required Technical Specifications
                  </h3>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Min. Payload</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                      {invite.rfq.payloadCapacityKg ? `${Number(invite.rfq.payloadCapacityKg)} kg` : 'Standard'}
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Min. Endurance</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                      {invite.rfq.enduranceMinutes ? `${invite.rfq.enduranceMinutes} mins` : 'Standard'}
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>DGCA Type Certified</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 2, color: invite.rfq.isDgcaRequired ? '#166534' : '#64748b' }}>
                      {invite.rfq.isDgcaRequired ? '✓ Mandatory' : 'Optional'}
                    </div>
                  </div>

                  {invite.rfq.targetBudgetInr && (
                    <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Target Budget</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                        {formatPrice(false, invite.rfq.targetBudgetInr)}
                      </div>
                    </div>
                  )}
                </div>

                {invite.rfq.specsDocumentUrl && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                    <a
                      href={invite.rfq.specsDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}
                    >
                      📄 Download Technical Tender Specs Document ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
            <aside className="platform-detail-sidebar">
              <div className="platform-card">
                <h3 className="platform-card-section-title">Buyer</h3>
                <p className="platform-detail-fact" style={{ fontWeight: 600 }}>
                  {invite.rfq.buyerOrganization.companyName}
                </p>
                <p className="platform-muted platform-detail-fact">
                {[
                  invite.rfq.buyerOrganization.city,
                  invite.rfq.buyerOrganization.state,
                  invite.rfq.buyerOrganization.country,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Location not specified'}
              </p>
            </div>
              {canRespond && (
                <form
                  className="platform-card platform-form platform-form-card"
                  onSubmit={submitQuote}
                >
                <fieldset className="platform-form-section">
                  <legend className="platform-form-section-title">
                    Your quotation
                  </legend>
                  <p className="platform-form-section-desc">
                    Submit pricing, lead time, and technical parameters for this requirement.
                  </p>
                  <label className="platform-checkbox-row">
                    <input
                      type="checkbox"
                      checked={quote.priceOnRequest}
                      onChange={(e) =>
                        setQuote((q) => ({
                          ...q,
                          priceOnRequest: e.target.checked,
                        }))
                      }
                    />
                    <span>Price on request</span>
                  </label>
                  {!quote.priceOnRequest && (
                    <div className="platform-field">
                      <label htmlFor="priceInr">Price (INR)</label>
                      <input
                        id="priceInr"
                        type="number"
                        min={0}
                        required
                        value={quote.priceInr}
                        onChange={(e) =>
                          setQuote((q) => ({ ...q, priceInr: e.target.value }))
                        }
                      />
                    </div>
                  )}
                  <div className="platform-field">
                    <label htmlFor="leadTimeDays">Lead time (days)</label>
                    <input
                      id="leadTimeDays"
                      type="number"
                      min={1}
                      value={quote.leadTimeDays}
                      onChange={(e) =>
                        setQuote((q) => ({
                          ...q,
                          leadTimeDays: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Technical Parameters */}
                  <div className="platform-field">
                    <label htmlFor="quotedPayload">Offered Payload (kg)</label>
                    <input
                      id="quotedPayload"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g. 16.0"
                      value={quote.quotedPayloadKg}
                      onChange={(e) =>
                        setQuote((q) => ({
                          ...q,
                          quotedPayloadKg: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="platform-field">
                    <label htmlFor="quotedEndurance">Flight Endurance (mins)</label>
                    <input
                      id="quotedEndurance"
                      type="number"
                      min="1"
                      placeholder="e.g. 40"
                      value={quote.quotedEnduranceMin}
                      onChange={(e) =>
                        setQuote((q) => ({
                          ...q,
                          quotedEnduranceMin: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="platform-field">
                    <label htmlFor="dgcaModel">DGCA Model / Certificate #</label>
                    <input
                      id="dgcaModel"
                      type="text"
                      placeholder="e.g. DGCA-TC-2024-UAV-001"
                      value={quote.dgcaModelNumber}
                      onChange={(e) =>
                        setQuote((q) => ({
                          ...q,
                          dgcaModelNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="platform-field">
                    <label htmlFor="warranty">Warranty (Months)</label>
                    <input
                      id="warranty"
                      type="number"
                      min="0"
                      placeholder="e.g. 12 or 24"
                      value={quote.warrantyMonths}
                      onChange={(e) =>
                        setQuote((q) => ({
                          ...q,
                          warrantyMonths: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="platform-field">
                    <label htmlFor="notes">Notes</label>
                    <textarea
                      id="notes"
                      value={quote.notes}
                      onChange={(e) =>
                        setQuote((q) => ({ ...q, notes: e.target.value }))
                      }
                    />
                  </div>
                  <div className="platform-actions">
                    <button
                      type="submit"
                      className="platform-btn platform-btn-cta platform-btn-full"
                      disabled={submitting}
                      aria-busy={submitting}
                    >
                      {submitting ? 'Submitting…' : 'Submit quote'}
                    </button>
                    <button
                      type="button"
                      className="platform-btn platform-btn-secondary platform-btn-full"
                      disabled={declining}
                      onClick={decline}
                    >
                      {declining ? 'Declining…' : 'Decline RFQ'}
                    </button>
                  </div>
                </fieldset>
                </form>
              )}
              {showQuotationSummary && submittedQuotation && (
                <QuotationSummary quotation={submittedQuotation} />
              )}
              {showQuotationSummary && !submittedQuotation && (
                <div className="platform-card">
                  <p className="platform-muted" style={{ margin: 0 }}>
                    You submitted a quotation for this RFQ.
                  </p>
                </div>
              )}
              {!canRespond && !showQuotationSummary && (
                <div className="platform-card">
                  <p className="platform-muted" style={{ margin: 0 }}>
                    {invite.status === 'DECLINED'
                      ? 'You declined this invite.'
                      : 'This RFQ is no longer open for new quotations.'}
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </PartnerPageShell>
  );
}
