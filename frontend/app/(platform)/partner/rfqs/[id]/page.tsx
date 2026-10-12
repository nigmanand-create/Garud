'use client';

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
  return (
    <div className="platform-card platform-form-card">
      <h3 className="platform-card-section-title">Your quotation</h3>
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
      {quotation.notes && (
        <p className="platform-detail-fact" style={{ whiteSpace: 'pre-wrap' }}>
          <span className="platform-detail-fact-label">Notes:</span>{' '}
          {quotation.notes}
        </p>
      )}
      <p className="platform-muted platform-detail-fact">
        Submitted — the buyer can compare your quote with other partners.
      </p>
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
                    {invite.rfq.quantity}
                  </p>
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
                    Submit pricing and lead time for this buyer requirement.
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
