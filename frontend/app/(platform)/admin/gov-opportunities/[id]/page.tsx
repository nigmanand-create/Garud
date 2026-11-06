'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  downloadAdminGovBidDocument,
  getAdminGovOpportunity,
  type AdminGovOpportunityDetail,
} from '@/lib/api/gov';
import { ApiError } from '@/lib/api/types';
import {
  closingLabel,
  formatInrCompact,
  GOV_STATUS_LABELS,
  GOV_TYPE_LABELS,
} from '@/lib/platform/verticals';

export default function AdminGovOpportunityDetailPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<AdminGovOpportunityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminGovOpportunity(id)
      .then(setItem)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load opportunity'),
      );
  }, [id]);

  if (error) return <div className="platform-card platform-error">{error}</div>;
  if (!item) return <PlatformLoading />;

  const inr = (v: string | number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(v));

  return (
    <div className="platform-admin-list-page">
      <PlatformPageHeader
        title={item.title}
        subtitle={`${GOV_TYPE_LABELS[item.type]} · ${item.issuingBody}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Gov & Tenders', href: '/admin/gov-opportunities' },
          { label: item.title },
        ]}
      />
      <div className="platform-admin-detail-stack">
        <div className="platform-card platform-admin-ops-section">
          <p>{item.summary}</p>
          <ul className="platform-list">
            {item.referenceNo && <li>Reference: {item.referenceNo}</li>}
            <li>Estimated value: {formatInrCompact(item.estimatedValueInr)}</li>
            <li>{closingLabel(item.closingDate)}</li>
          </ul>
          <StatusBadge status={item.status} label={GOV_STATUS_LABELS[item.status]} />
        </div>

        {item.type === 'TENDER' && (
          <section className="platform-card" aria-labelledby="bids-heading">
            <h2 id="bids-heading">Sealed bid vault</h2>
            {item.bids.sealed ? (
              <p className="platform-muted">
                {item.bids.bidCount} bid{item.bids.bidCount === 1 ? '' : 's'} received.
                Amounts stay sealed until{' '}
                {item.bids.unsealsAt
                  ? new Date(item.bids.unsealsAt).toLocaleString('en-IN')
                  : 'the closing date is set'}
                .
              </p>
            ) : (
              <>
                <p className="platform-muted">
                  Bidding closed — {item.bids.bidCount} bid
                  {item.bids.bidCount === 1 ? '' : 's'} (lowest first).
                </p>
                {item.bids.items.length === 0 ? (
                  <p className="platform-muted">No bids were submitted.</p>
                ) : (
                  <div className="platform-table-wrap">
                    <table className="platform-table">
                      <thead>
                        <tr>
                          <th>Bidder</th>
                          <th>Amount</th>
                          <th>Document</th>
                          <th>Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.bids.items.map((b) => (
                          <tr key={b.id}>
                            <td>
                              {b.bidderEmail}
                              <div className="platform-text-muted">{b.bidderRole}</div>
                            </td>
                            <td>{inr(b.amountInr)}</td>
                            <td>
                              {b.hasDocument ? (
                                <button
                                  type="button"
                                  className="platform-link-btn"
                                  onClick={() =>
                                    void downloadAdminGovBidDocument(
                                      id,
                                      b.id,
                                      b.originalFilename ?? 'bid-document.pdf',
                                    )
                                  }
                                >
                                  {b.originalFilename ?? 'Download'}
                                </button>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>{new Date(b.submittedAt).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        <p>
          <Link href="/admin/gov-opportunities" className="platform-link-btn">
            ← Back to list
          </Link>
        </p>
      </div>
    </div>
  );
}
