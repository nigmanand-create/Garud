'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { listPartnerLeads, updatePartnerLead } from '@/lib/api/enquiries';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { EmptyState } from '@/components/platform/EmptyState';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { ENQUIRY_INTENT_LABELS, LEAD_STATUS_LABELS } from '@/lib/platform/labels';
import type {
  EnquiryIntent,
  LeadStatus,
  PartnerLead,
  PartnerLeadsResponse,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];
const INTENTS = Object.keys(ENQUIRY_INTENT_LABELS) as EnquiryIntent[];

export default function PartnerLeadsPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <LeadsInner />
    </RequireAuth>
  );
}

function LeadsInner() {
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [intent, setIntent] = useState<EnquiryIntent | ''>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<PartnerLeadsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const i = params.get('intent') as EnquiryIntent | null;
    if (i && INTENTS.includes(i)) setIntent(i);
  }, []);

  const load = useCallback(() => {
    setError(null);
    listPartnerLeads({
      status: status || undefined,
      intent: intent || undefined,
      q: query || undefined,
      take: 50,
    })
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load leads'),
      );
  }, [status, intent, query]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchLead(id: string, body: { status?: LeadStatus; partnerNote?: string }) {
    try {
      await updatePartnerLead(id, body);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    }
  }

  const total = data ? STATUSES.reduce((n, s) => n + data.statusCounts[s], 0) : 0;
  const closed = data ? data.statusCounts.WON + data.statusCounts.LOST : 0;
  const winRate = closed > 0 && data ? Math.round((data.statusCounts.WON / closed) * 100) : null;

  return (
    <PartnerPageShell>
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Leads"
          subtitle="Your sales pipeline: every routed buyer enquiry becomes a lead you can qualify, win, or close out. Read the raw messages in Enquiries; RFQ invites stay under RFQs."
          actions={
            <Link href="/partner/enquiries" className="platform-btn platform-btn-secondary">
              Open enquiry inbox
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
                  className={`mod-kpi-card${status === s ? ' mod-kpi-card--active' : ''}`}
                  key={s}
                  onClick={() => setStatus(status === s ? '' : s)}
                  aria-pressed={status === s}
                >
                  <div className="mod-kpi-data">
                    <div className="mod-kpi-num">{data.statusCounts[s]}</div>
                    <div className="mod-kpi-label">{LEAD_STATUS_LABELS[s]}</div>
                  </div>
                </button>
              ))}
              <div className="mod-kpi-card" style={{ cursor: 'default' }}>
                <div className="mod-kpi-data">
                  <div className="mod-kpi-num">{winRate == null ? '—' : `${winRate}%`}</div>
                  <div className="mod-kpi-label">Win rate ({total} total)</div>
                </div>
              </div>
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
              <label htmlFor="lead-intent-filter">Lead type</label>
              <select
                id="lead-intent-filter"
                value={intent}
                onChange={(e) => setIntent((e.target.value || '') as EnquiryIntent | '')}
              >
                <option value="">All types</option>
                {INTENTS.map((i) => (
                  <option key={i} value={i}>
                    {ENQUIRY_INTENT_LABELS[i]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lead-status-filter">Status</label>
              <select
                id="lead-status-filter"
                value={status}
                onChange={(e) => setStatus((e.target.value || '') as LeadStatus | '')}
              >
                <option value="">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lead-search">Search</label>
              <input
                id="lead-search"
                type="search"
                placeholder="Name, email or subject"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="platform-btn platform-btn-secondary">
              Apply
            </button>
          </form>

          {data === null && !error && <PlatformLoading />}

          {data && data.items.length > 0 && (
            <div className="platform-card">
              <div className="platform-table-wrap">
                <table className="platform-table">
                  <thead>
                    <tr>
                      <th>Received</th>
                      <th>Contact</th>
                      <th>Subject</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((lead) => (
                      <Fragment key={lead.id}>
                        <tr>
                          <td>{new Date(lead.createdAt).toLocaleString('en-IN')}</td>
                          <td>
                            <div>{lead.enquiry.name}</div>
                            <div className="platform-text-muted">
                              <a href={`mailto:${lead.enquiry.email}`}>{lead.enquiry.email}</a>
                            </div>
                            {lead.enquiry.phone && (
                              <div className="platform-text-muted">{lead.enquiry.phone}</div>
                            )}
                          </td>
                          <td>
                            {lead.enquiry.subject}
                            {lead.listing && (
                              <div className="platform-text-muted">Listing: {lead.listing.name}</div>
                            )}
                          </td>
                          <td>{ENQUIRY_INTENT_LABELS[lead.intent] ?? lead.intent}</td>
                          <td>
                            <StatusBadge
                              status={lead.status}
                              label={LEAD_STATUS_LABELS[lead.status]}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="platform-btn platform-btn-secondary platform-btn-sm"
                              onClick={() =>
                                setExpandedId(expandedId === lead.id ? null : lead.id)
                              }
                            >
                              {expandedId === lead.id ? 'Hide' : 'Manage'}
                            </button>
                          </td>
                        </tr>
                        {expandedId === lead.id && (
                          <tr>
                            <td colSpan={6}>
                              <LeadDetail lead={lead} onPatch={patchLead} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data && data.items.length === 0 && !error && (
            <EmptyState
              title={status || intent || query ? 'No leads match these filters' : 'No leads yet'}
              description="Leads are created when buyers use “Contact supplier”, “Request demo” or your public profile, or when the GarudHub team routes an enquiry to you."
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

function LeadDetail({
  lead,
  onPatch,
}: {
  lead: PartnerLead;
  onPatch: (id: string, body: { status?: LeadStatus; partnerNote?: string }) => Promise<void>;
}) {
  const [note, setNote] = useState(lead.partnerNote ?? '');
  const [saving, setSaving] = useState(false);

  return (
    <div className="platform-form">
      <p style={{ whiteSpace: 'pre-wrap' }}>{lead.enquiry.message}</p>
      {lead.enquiry.sourcePage && (
        <p className="platform-text-muted platform-text-sm">Source: {lead.enquiry.sourcePage}</p>
      )}
      <div className="platform-form-field-pair">
        <div>
          <label htmlFor={`lead-status-${lead.id}`}>Pipeline stage</label>
          <select
            id={`lead-status-${lead.id}`}
            value={lead.status}
            onChange={(e) => onPatch(lead.id, { status: e.target.value as LeadStatus })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {lead.contactedAt && (
            <p className="platform-text-muted platform-text-sm">
              First contacted {new Date(lead.contactedAt).toLocaleString('en-IN')}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`lead-note-${lead.id}`}>Private note</label>
          <textarea
            id={`lead-note-${lead.id}`}
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Only visible to your team"
          />
          <button
            type="button"
            className="platform-btn platform-btn-secondary platform-btn-sm"
            disabled={saving || note === (lead.partnerNote ?? '')}
            onClick={async () => {
              setSaving(true);
              await onPatch(lead.id, { partnerNote: note });
              setSaving(false);
            }}
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>
      <p>
        <a
          className="platform-btn platform-btn-cta platform-btn-sm"
          href={`mailto:${lead.enquiry.email}?subject=${encodeURIComponent(`Re: ${lead.enquiry.subject}`)}`}
        >
          Reply by email
        </a>
      </p>
    </div>
  );
}
