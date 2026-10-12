'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { CATEGORY_LABELS, formatPrice } from '@/lib/platform/labels';
import type { CatalogCategory, RfqStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type RfqDetail = {
  id: string;
  title: string;
  description: string;
  status: RfqStatus;
  category: CatalogCategory;
  quantity?: number | null;
  _count: { invites: number; quotations: number };
};

type QuotationRow = {
  id: string;
  priceOnRequest: boolean;
  priceInr?: string | null;
  leadTimeDays?: number | null;
  notes?: string | null;
  vendorOrganization: {
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
  const params = useParams();
  const id = params.id as string;
  const [rfq, setRfq] = useState<RfqDetail | null>(null);
  const [quotes, setQuotes] = useState<QuotationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        setError(e instanceof ApiError ? e.message : 'Failed to load'),
      );
  }

  useEffect(() => {
    load();
  }, [id]);

  async function closeRfq() {
    try {
      await apiRequest(`/rfq/${id}/close`, { method: 'POST', auth: true });
      setMessage('RFQ closed.');
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

  if (!rfq && !error) {
    return <p className="platform-muted">Loading…</p>;
  }

  return (
    <>
      {error && <div className="platform-card platform-error">{error}</div>}
      {message && <div className="platform-card platform-success">{message}</div>}
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
                {CATEGORY_LABELS[rfq.category]} · {rfq._count.invites} invites ·{' '}
                {rfq._count.quotations} quotations
              </>
            }
            badge={<StatusBadge status={rfq.status} />}
          />
          <div className="platform-card">
            <p style={{ whiteSpace: 'pre-wrap' }}>{rfq.description}</p>
            {rfq.quantity != null && (
              <p>
                <strong>Quantity:</strong> {rfq.quantity}
              </p>
            )}
            {rfq.status === 'OPEN' && (
              <div className="platform-actions">
                <button type="button" className="platform-btn" onClick={closeRfq}>
                  Close RFQ
                </button>
                <button
                  type="button"
                  className="platform-btn platform-btn-secondary"
                  onClick={cancelRfq}
                >
                  Cancel RFQ
                </button>
              </div>
            )}
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: '1.5rem 0 0.75rem' }}>Compare quotations</h2>
          <div className="platform-grid">
            {quotes.map((q) => (
              <article key={q.id} className="platform-card">
                <h3>{q.vendorOrganization.companyName}</h3>
                <p>{formatPrice(q.priceOnRequest, q.priceInr)}</p>
                {q.leadTimeDays != null && (
                  <p>Lead time: {q.leadTimeDays} days</p>
                )}
                {q.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{q.notes}</p>}
                <p className="platform-muted">
                  {q.vendorOrganization.contactEmail} ·{' '}
                  {q.vendorOrganization.contactMobile}
                </p>
                {q.vendorOrganization.website && (
                  <p>{q.vendorOrganization.website}</p>
                )}
              </article>
            ))}
          </div>
          {quotes.length === 0 && (
            <p className="platform-muted">No submitted quotations yet.</p>
          )}
        </>
      )}
    </>
  );
}
