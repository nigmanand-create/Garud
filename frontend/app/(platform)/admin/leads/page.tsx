'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Fragment, Suspense, useCallback, useEffect, useState } from 'react';
import { assignEnquiry } from '@/lib/api/enquiries';
import { apiRequest } from '@/lib/api/client';
import {
  listAdminLeads,
  updateAdminLead,
  type AdminLead,
  type AdminLeadsResponse,
} from '@/lib/api/admin';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { ENQUIRY_INTENT_LABELS, LEAD_STATUS_LABELS } from '@/lib/platform/labels';
import type { LeadStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];
const PAGE_SIZE = 25;

type PartnerOption = { id: string; companyName: string };

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [partners, setPartners] = useState<PartnerOption[]>([]);

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

  useEffect(() => {
    apiRequest<PartnerOption[]>('/admin/applications?status=APPROVED', {
      auth: true,
    })
      .then((rows) =>
        setPartners(rows.map((r) => ({ id: r.id, companyName: r.companyName }))),
      )
      .catch(() => setPartners([]));
  }, []);

  async function patchLead(
    id: string,
    body: { status?: LeadStatus; partnerNote?: string; organizationId?: string },
  ) {
    try {
      await updateAdminLead(id, body);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    }
  }

  async function routeLead(lead: AdminLead, organizationId: string) {
    const target = organizationId.trim() || null;
    if (target === lead.organization.id) return;
    try {
      await assignEnquiry(lead.enquiry.id, target);
      setExpandedId(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Routing failed');
    }
  }

  const pages = data ? Math.max(Math.ceil(data.total / PAGE_SIZE), 1) : 1;

  return (
    <div className="platform-admin-list-page">
      <PlatformPageHeader
        title="Partner leads"
        subtitle="Oversight of enquiries routed to partners: update pipeline status and notes, or reroute to another verified partner (same mechanics as the enquiry queue)."
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

      <div className="platform-card platform-admin-ops-section platform-form platform-filter-bar platform-admin-list-filter-bar">
        <div className="platform-admin-list-filter-field">
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
        <div className="platform-admin-list-filter-field">
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
        <div className="platform-admin-list-filter-field platform-admin-list-filter-field--action">
          <label className="platform-admin-list-filter-action-label" aria-hidden="true">
            &nbsp;
          </label>
          <button
            type="button"
            className="platform-btn platform-btn-secondary platform-btn-sm"
            disabled={loading}
            onClick={() => load()}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="platform-card platform-error">{error}</div>}

      <div
        className="platform-card platform-admin-ops-section platform-card--flush"
        aria-busy={loading}
      >
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
                    <th className="platform-table-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={7}>No leads in this filter.</td>
                    </tr>
                  )}
                  {data.items.map((l) => (
                    <Fragment key={l.id}>
                      <tr>
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
                        <td className="platform-table-actions-row">
                          <button
                            type="button"
                            className="platform-btn platform-btn-secondary platform-btn-sm"
                            onClick={() =>
                              setExpandedId(expandedId === l.id ? null : l.id)
                            }
                          >
                            {expandedId === l.id ? 'Hide' : 'Manage'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === l.id && (
                        <tr>
                          <td colSpan={7}>
                            <LeadManagePanel
                              lead={l}
                              partners={partners}
                              onPatch={patchLead}
                              onRoute={routeLead}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="platform-admin-list-pagination">
              <span className="platform-text-sm platform-muted">
                {data.total} lead{data.total === 1 ? '' : 's'} · page {page + 1} of {pages}
              </span>
              <span className="platform-admin-list-pagination-actions">
                <button
                  type="button"
                  className="platform-btn platform-btn-secondary platform-btn-sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                >
                  Previous
                </button>
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

function LeadManagePanel({
  lead,
  partners,
  onPatch,
  onRoute,
}: {
  lead: AdminLead;
  partners: PartnerOption[];
  onPatch: (
    id: string,
    body: { status?: LeadStatus; partnerNote?: string; organizationId?: string },
  ) => Promise<void>;
  onRoute: (lead: AdminLead, organizationId: string) => Promise<void>;
}) {
  const [note, setNote] = useState(lead.partnerNote ?? '');
  const [savingNote, setSavingNote] = useState(false);

  return (
    <div className="platform-form" style={{ padding: '0.75rem 0' }}>
      <div className="platform-form-field-pair">
        <div>
          <label htmlFor={`admin-lead-status-${lead.id}`}>Pipeline stage</label>
          <select
            id={`admin-lead-status-${lead.id}`}
            className="mod-filter-select"
            value={lead.status}
            onChange={(e) =>
              onPatch(lead.id, { status: e.target.value as LeadStatus })
            }
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
          <label htmlFor={`admin-lead-partner-${lead.id}`}>Routed to</label>
          <select
            id={`admin-lead-partner-${lead.id}`}
            className="platform-table-inline-select"
            aria-label={`Reroute lead for ${lead.enquiry.subject}`}
            value={lead.organization.id}
            onChange={(e) => onRoute(lead, e.target.value)}
          >
            <option value="">Admin queue (unroute)</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.companyName}
              </option>
            ))}
            {!partners.some((p) => p.id === lead.organization.id) && (
              <option value={lead.organization.id}>{lead.organization.companyName}</option>
            )}
          </select>
          <p className="platform-text-muted platform-text-sm">
            Changing partner uses the same routing rules as{' '}
            <Link href="/admin/enquiries" className="platform-link-btn">
              Enquiry queue
            </Link>
            .
          </p>
        </div>
      </div>
      <div>
        <label htmlFor={`admin-lead-note-${lead.id}`}>Partner note (visible to partner)</label>
        <textarea
          id={`admin-lead-note-${lead.id}`}
          rows={3}
          maxLength={2000}
          className="mod-filter-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Internal handoff or context for the partner org"
        />
        <button
          type="button"
          className="platform-btn platform-btn-secondary platform-btn-sm"
          disabled={savingNote || note === (lead.partnerNote ?? '')}
          onClick={async () => {
            setSavingNote(true);
            await onPatch(lead.id, { partnerNote: note });
            setSavingNote(false);
          }}
        >
          {savingNote ? 'Saving…' : 'Save note'}
        </button>
      </div>
    </div>
  );
}
