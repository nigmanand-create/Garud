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
import { FormField } from '@/components/platform/FormField';
import {
  CATEGORY_LABELS,
  formatPrice,
  RFQ_INVITE_STATUS_LABELS,
} from '@/lib/platform/labels';
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

type PartnerRfqCore = PartnerRfqInviteDetail['rfq'];

function formatRfqDeadline(deadlineAt: string) {
  return new Date(deadlineAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function RequestSummarySection({ rfq }: { rfq: PartnerRfqCore }) {
  const isListingLinked = Boolean(rfq.listingId);
  const listing = rfq.listing;
  const listingId = listing?.id ?? rfq.listingId;
  const showPayload =
    !isListingLinked || rfq.payloadCapacityKg != null;
  const showEndurance =
    !isListingLinked || rfq.enduranceMinutes != null;

  return (
    <div className="platform-card platform-prose">
      <h3 className="platform-section-heading">Request summary</h3>
      <p className="platform-pre-wrap">{rfq.description}</p>

      {listingId && (
        <p className="platform-detail-fact">
          <span className="platform-detail-fact-label">Catalog listing:</span>{' '}
          <Link
            href={`/partner/catalog/${listingId}`}
            className="platform-badge platform-badge--category platform-inline-link"
          >
            {listing?.name ?? 'View listing'}
          </Link>
          {listing?.sku && (
            <span className="platform-muted platform-text-sm">
              {' '}
              · SKU {listing.sku}
            </span>
          )}
        </p>
      )}
      {isListingLinked && (
        <p className="platform-muted platform-text-sm">
          Payload, endurance, and technical specs are defined on your{' '}
          {listingId ? (
            <Link
              href={`/partner/catalog/${listingId}`}
              className="platform-inline-link"
            >
              catalog listing
            </Link>
          ) : (
            'catalog listing'
          )}
          .
        </p>
      )}

      <div className="platform-stat-grid platform-stat-grid--specs">
        {rfq.quantity != null && (
          <div>
            <span className="platform-stat-spec-label">Quantity</span>
            <div className="platform-stat-spec-value">{rfq.quantity} units</div>
          </div>
        )}
        {rfq.deadlineAt && (
          <div>
            <span className="platform-stat-spec-label">Quote deadline</span>
            <div className="platform-stat-spec-value">
              {formatRfqDeadline(rfq.deadlineAt)}
            </div>
          </div>
        )}
        {rfq.targetBudgetInr != null && (
          <div>
            <span className="platform-stat-spec-label">Buyer budget</span>
            <div className="platform-stat-spec-value">
              {formatPrice(false, rfq.targetBudgetInr)}
            </div>
          </div>
        )}
        <div>
          <span className="platform-stat-spec-label">DGCA type certificate</span>
          <div
            className={`platform-stat-spec-value ${
              rfq.isDgcaRequired ? 'platform-stat-spec-value--success' : ''
            }`}
          >
            {rfq.isDgcaRequired ? 'Required' : 'Not required'}
          </div>
        </div>
        {!isListingLinked && showPayload && (
          <div>
            <span className="platform-stat-spec-label">Min. payload</span>
            <div className="platform-stat-spec-value">
              {rfq.payloadCapacityKg
                ? `${Number(rfq.payloadCapacityKg)} kg`
                : '—'}
            </div>
          </div>
        )}
        {!isListingLinked && showEndurance && (
          <div>
            <span className="platform-stat-spec-label">Min. endurance</span>
            <div className="platform-stat-spec-value">
              {rfq.enduranceMinutes ? `${rfq.enduranceMinutes} mins` : '—'}
            </div>
          </div>
        )}
      </div>

      {rfq.specsDocumentUrl && (
        <p className="platform-detail-fact">
          <a
            href={rfq.specsDocumentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="platform-inline-link"
          >
            Download tender specifications ↗
          </a>
        </p>
      )}
    </div>
  );
}

export default function PartnerRfqDetailPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <DetailInner />
    </RequireAuth>
  );
}

function QuotationSummary({
  quotation,
  hideTechnicalSpecs,
}: {
  quotation: PartnerQuotation;
  hideTechnicalSpecs?: boolean;
}) {
  const isAccepted = quotation.status === 'ACCEPTED';
  const isRejected = quotation.status === 'REJECTED';

  const cardClass = [
    'platform-card platform-form-card',
    isAccepted ? 'platform-quotation-card--accepted' : '',
    isRejected ? 'platform-quotation-card--rejected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClass}>
      <div className="platform-quotation-card__head">
        <h3 className="platform-card-section-title">Your commercial offer</h3>
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
      {!hideTechnicalSpecs && quotation.quotedPayloadKg != null && (
        <p className="platform-detail-fact">
          <span className="platform-detail-fact-label">Quoted Payload:</span>{' '}
          <strong>{Number(quotation.quotedPayloadKg)} kg</strong>
        </p>
      )}
      {!hideTechnicalSpecs && quotation.quotedEnduranceMin != null && (
        <p className="platform-detail-fact">
          <span className="platform-detail-fact-label">Quoted Endurance:</span>{' '}
          <strong>{quotation.quotedEnduranceMin} mins</strong>
        </p>
      )}
      {quotation.dgcaModelNumber && (
        <p className="platform-detail-fact">
          <span className="platform-detail-fact-label">DGCA Certification:</span>{' '}
          <span className="platform-dgca-cert">
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
        <p className="platform-detail-fact platform-pre-wrap">
          <span className="platform-detail-fact-label">Notes:</span>{' '}
          {quotation.notes}
        </p>
      )}

      {isAccepted && (
        <div className="platform-quotation-award">
          <strong>🎉 Quotation Awarded!</strong>
          <p>
            Congratulations! The buyer accepted your quotation and a Purchase Order has been placed with your organization.
          </p>
          <Link
            href="/partner/orders"
            className="platform-btn platform-btn-cta platform-btn-sm"
          >
            View Incoming Orders →
          </Link>
        </div>
      )}

      {isRejected && (
        <div className="platform-quotation-rejected">
          This quotation was not awarded by the buyer.
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

  useEffect(() => {
    const listing = invite?.rfq.listing;
    if (!invite?.rfq.listingId || !listing) return;
    if (listing.priceOnRequest || listing.priceInr == null) return;
    setQuote((q) =>
      q.priceInr === ''
        ? { ...q, priceInr: String(listing.priceInr) }
        : q,
    );
  }, [invite?.rfq.listingId, invite?.rfq.listing]);

  async function submitQuote(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    const listingLinkedQuote = Boolean(invite?.rfq.listingId);
    try {
      const created = await apiRequest<PartnerQuotation>(
        `/partner/rfqs/${id}/quotations`,
        {
          method: 'POST',
          auth: true,
          body: {
            priceOnRequest: false,
            priceInr: Number(quote.priceInr),
            leadTimeDays: quote.leadTimeDays
              ? Number(quote.leadTimeDays)
              : undefined,
            notes: quote.notes || undefined,
            ...(listingLinkedQuote
              ? {}
              : {
                  quotedPayloadKg: quote.quotedPayloadKg
                    ? Number(quote.quotedPayloadKg)
                    : undefined,
                  quotedEnduranceMin: quote.quotedEnduranceMin
                    ? Number(quote.quotedEnduranceMin)
                    : undefined,
                }),
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

  const isListingLinked = Boolean(invite?.rfq.listingId);

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
                  {CATEGORY_LABELS[invite.rfq.category]} ·{' '}
                  {RFQ_INVITE_STATUS_LABELS[invite.status]}
                </>
              }
              badge={<StatusBadge status={invite.rfq.status} />}
            />
              <RequestSummarySection rfq={invite.rfq} />
            </div>
            <aside className="platform-detail-sidebar">
              <div className="platform-card">
                <h3 className="platform-card-section-title">Buyer</h3>
                <p className="platform-detail-fact platform-font-semibold">
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
                    Your commercial offer
                  </legend>
                  <p className="platform-form-section-desc">
                    {isListingLinked
                      ? 'Confirm unit price and commercial terms for this catalog RFQ.'
                      : 'Provide unit price, delivery timeline, and technical parameters.'}
                  </p>
                  <FormField label="Unit price (INR)" htmlFor="priceInr">
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
                  </FormField>
                  <FormField label="Lead time (days)" htmlFor="leadTimeDays">
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
                  </FormField>

                  {!isListingLinked && (
                    <>
                      <FormField label="Offered Payload (kg)" htmlFor="quotedPayload">
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
                      </FormField>
                      <FormField label="Flight Endurance (mins)" htmlFor="quotedEndurance">
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
                      </FormField>
                    </>
                  )}
                  <FormField label="DGCA Model / Certificate #" htmlFor="dgcaModel">
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
                  </FormField>
                  <FormField label="Warranty (Months)" htmlFor="warranty">
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
                  </FormField>

                  <FormField label="Notes" htmlFor="notes">
                    <textarea
                      id="notes"
                      value={quote.notes}
                      onChange={(e) =>
                        setQuote((q) => ({ ...q, notes: e.target.value }))
                      }
                    />
                  </FormField>
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
                <QuotationSummary
                  quotation={submittedQuotation}
                  hideTechnicalSpecs={isListingLinked}
                />
              )}
              {showQuotationSummary && !submittedQuotation && (
                <div className="platform-card">
                  <p className="platform-muted platform-detail-fact" role="status">
                    You submitted a quotation for this RFQ.
                  </p>
                </div>
              )}
              {!canRespond && !showQuotationSummary && (
                <div className="platform-card">
                  <p className="platform-muted platform-detail-fact">
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
