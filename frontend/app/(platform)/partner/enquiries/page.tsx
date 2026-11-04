'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  listPartnerEnquiries,
  updatePartnerEnquiryStatus,
} from '@/lib/api/enquiries';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { EmptyState } from '@/components/platform/EmptyState';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { ENQUIRY_INTENT_LABELS, LEAD_STATUS_LABELS } from '@/lib/platform/labels';
import type {
  EnquiryStatus,
  PartnerEnquiriesResponse,
  PartnerEnquiryRecord,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: 'New',
  READ: 'Read',
  CLOSED: 'Closed',
};
const STATUSES = Object.keys(STATUS_LABELS) as EnquiryStatus[];

export default function PartnerEnquiriesPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <EnquiriesInner />
    </RequireAuth>
  );
}

function EnquiriesInner() {
  const [filter, setFilter] = useState<EnquiryStatus | ''>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<PartnerEnquiriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    listPartnerEnquiries({
      status: filter || undefined,
      q: query || undefined,
      take: 50,
    })
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load enquiries'),
      );
  }, [filter, query]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: EnquiryStatus) {
    try {
      await updatePartnerEnquiryStatus(id, status);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    }
  }

  function open(item: PartnerEnquiryRecord) {
    setSelectedId(item.id);
    if (item.status === 'NEW') void setStatus(item.id, 'READ');
  }

  const selected = data?.items.find((i) => i.id === selectedId) ?? null;

  return (
    <PartnerPageShell>
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Enquiries"
          subtitle="Inbox of messages buyers sent to you or that GarudHub routed to you. Track follow-up in Leads."
          actions={
            <Link href="/partner/leads" className="platform-btn platform-btn-secondary">
              Open leads pipeline
            </Link>
          }
        />
        <div className="platform-form-layout platform-form-layout--full">
          {error && <div className="platform-card platform-error">{error}</div>}

          {data && (
            <div className="mod-kpi-grid" style={{ marginBottom: '1rem' }}>
              {STATUSES.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`mod-kpi-card${filter === s ? ' mod-kpi-card--active' : ''}`}
                  onClick={() => setFilter(filter === s ? '' : s)}
                  aria-pressed={filter === s}
                >
                  <div className="mod-kpi-data">
                    <div className="mod-kpi-num">{data.statusCounts[s]}</div>
                    <div className="mod-kpi-label">{STATUS_LABELS[s]}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <form
            className="platform-card platform-form platform-filter-bar"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search.trim());
            }}
          >
            <div>
              <label htmlFor="enq-search">Search</label>
              <input
                id="enq-search"
                type="search"
                placeholder="Name, email, subject or message"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="platform-btn platform-btn-secondary">
              Search
            </button>
          </form>

          {data === null && !error && <PlatformLoading />}

          {data && data.items.length > 0 && (
            <div className="platform-partner-inbox">
              <div className="platform-inbox-list" role="list">
                {data.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="listitem"
                    className={`platform-inbox-item${selectedId === item.id ? ' platform-inbox-item--selected' : ''}`}
                    onClick={() => open(item)}
                    style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }}
                  >
                    <div className="platform-inbox-item-main">
                      <h3>
                        {item.status === 'NEW' && <span aria-label="Unread">● </span>}
                        {item.subject}
                      </h3>
                      <div className="platform-inbox-item-meta">
                        <span>{item.name}</span>
                        <StatusBadge status={item.status} label={STATUS_LABELS[item.status]} />
                        <span className="platform-muted">
                          {ENQUIRY_INTENT_LABELS[item.intent] ?? item.intent}
                        </span>
                      </div>
                    </div>
                    <div className="platform-muted platform-inbox-date">
                      {new Date(item.createdAt).toLocaleDateString('en-IN')}
                    </div>
                  </button>
                ))}
              </div>

              {selected && (
                <article className="platform-card platform-mt-sm" aria-live="polite">
                  <h2 style={{ marginTop: 0 }}>{selected.subject}</h2>
                  <p className="platform-muted platform-text-sm">
                    From {selected.name} ·{' '}
                    <a href={`mailto:${selected.email}`}>{selected.email}</a>
                    {selected.phone ? ` · ${selected.phone}` : ''} ·{' '}
                    {new Date(selected.createdAt).toLocaleString('en-IN')}
                  </p>
                  {selected.listing && (
                    <p className="platform-text-sm">
                      About listing:{' '}
                      <Link href={`/marketplace/listings/${selected.listing.id}`}>
                        {selected.listing.name}
                      </Link>
                    </p>
                  )}
                  <p style={{ whiteSpace: 'pre-wrap' }}>{selected.message}</p>
                  <div className="platform-form-actions">
                    <a
                      className="platform-btn platform-btn-cta"
                      href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject}`)}`}
                    >
                      Reply by email
                    </a>
                    {selected.status !== 'CLOSED' ? (
                      <button
                        type="button"
                        className="platform-btn platform-btn-secondary"
                        onClick={() => setStatus(selected.id, 'CLOSED')}
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="platform-btn platform-btn-secondary"
                        onClick={() => setStatus(selected.id, 'READ')}
                      >
                        Reopen
                      </button>
                    )}
                    {selected.status === 'READ' && (
                      <button
                        type="button"
                        className="platform-btn platform-btn-secondary"
                        onClick={() => setStatus(selected.id, 'NEW')}
                      >
                        Mark unread
                      </button>
                    )}
                    {selected.lead && (
                      <Link href="/partner/leads" className="platform-btn platform-btn-secondary">
                        Lead: {LEAD_STATUS_LABELS[selected.lead.status]}
                      </Link>
                    )}
                  </div>
                </article>
              )}
            </div>
          )}

          {data && data.items.length === 0 && !error && (
            <EmptyState
              title={filter || query ? 'No enquiries match' : 'No enquiries yet'}
              description="When buyers use “Contact supplier”, “Request demo” or your public profile, or the GarudHub team routes an enquiry to you, it appears here."
              primaryAction={{ label: 'Manage catalog', href: '/partner/catalog' }}
              secondaryAction={{ label: 'View RFQ inbox', href: '/partner/rfqs' }}
              icon="📨"
            />
          )}
        </div>
      </div>
    </PartnerPageShell>
  );
}
