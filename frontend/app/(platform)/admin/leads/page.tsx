'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { listAdminLeads, type AdminLeadsResponse } from '@/lib/api/admin';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { ENQUIRY_INTENT_LABELS, LEAD_STATUS_LABELS } from '@/lib/platform/labels';
import type { LeadStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];
const PAGE_SIZE = 25;

export default function AdminLeadsPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <Suspense fallback={<PlatformLoading />}>
        <LeadsInner />
      </Suspense>
    </RequireAuth>
  );
}

function LeadsInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [stale, setStale] = useState(params.get('stale') === 'true');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminLeadsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listAdminLeads({
      status: status || undefined,
      stale,
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : 'Failed to load leads');
        setLoading(false);
      });
  }, [status, stale, page]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = data ? Math.max(Math.ceil(data.total / PAGE_SIZE), 1) : 1;

  return (
    <div className="platform-admin-list-page">
      <PlatformPageHeader
        title="Partner leads"
        subtitle="Read-only oversight of enquiries routed to partners. Partners work their own leads at /partner/leads; use this view to spot leads nobody has touched."
      />

      {data && (
        <div className="mod-kpi-grid">
          {(['NEW', 'CONTACTED', 'QUALIFIED', 'WON'] as LeadStatus[]).map((s) => (
            <div
              key={s}
              className={`mod-kpi-card${status === s && !stale ? ' mod-kpi-card--active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                setStale(false);
                setStatus(s);
                setPage(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setStale(false);
                  setStatus(s);
                  setPage(0);
                }
              }}
            >
              <div className="mod-kpi-data">
                <div className="mod-kpi-num">{data.statusCounts[s] ?? 0}</div>
                <div className="mod-kpi-label">{LEAD_STATUS_LABELS[s]}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="platform-card platform-form platform-filter-bar">
        <div>
          <label htmlFor="lead-status">Status</label>
          <select
            id="lead-status"
            className="mod-filter-select"
            value={status}
            disabled={stale}
            onChange={(e) => {
              setStatus((e.target.value || '') as LeadStatus | '');
              setPage(0);
            }}
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
                {data ? ` (${data.statusCounts[s]})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="lead-stale">
            <input
              id="lead-stale"
              type="checkbox"
              checked={stale}
              onChange={(e) => {
                setStale(e.target.checked);
                setPage(0);
              }}
            />{' '}
            Stale only (new, untouched 3+ days)
          </label>
        </div>
      </div>

      {error && <div className="platform-card platform-error">{error}</div>}

      <div className="platform-card platform-card--flush" aria-busy={loading}>
        {loading && !data ? (
          <PlatformLoading />
        ) : data ? (
          <>
            <div className="platform-table-wrap">
              <table className="platform-table mod-table">
                <thead>
                  <tr>
                    <th>Received</th>
                    <th>Partner</th>
                    <th>Contact</th>
                    <th>Subject</th>
                    <th>Source</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={6}>No leads in this filter.</td>
                    </tr>
                  )}
                  {data.items.map((l) => (
                    <tr key={l.id}>
                      <td>{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <Link href={`/admin/applications/${l.organization.id}`}>
                          {l.organization.companyName}
                        </Link>
                      </td>
                      <td>
                        {l.enquiry.name}
                        <div className="platform-text-muted">{l.enquiry.email}</div>
                      </td>
                      <td>
                        {l.enquiry.subject}
                        {l.listing && (
                          <div className="platform-text-muted">Listing: {l.listing.name}</div>
                        )}
                      </td>
                      <td>{ENQUIRY_INTENT_LABELS[l.intent]}</td>
                      <td>
                        <StatusBadge status={l.status} label={LEAD_STATUS_LABELS[l.status]} />
                        {l.partnerNote && (
                          <div className="platform-text-muted">{l.partnerNote}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="platform-admin-list-pagination">
              <span className="platform-text-sm platform-muted">
                {data.total} lead{data.total === 1 ? '' : 's'} · page {page + 1} of {pages}
              </span>
              <span>
                <button
                  type="button"
                  className="platform-btn platform-btn-secondary platform-btn-sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                >
                  Previous
                </button>{' '}
                <button
                  type="button"
                  className="platform-btn platform-btn-secondary platform-btn-sm"
                  disabled={page + 1 >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
