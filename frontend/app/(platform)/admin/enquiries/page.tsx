'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  assignEnquiry,
  bulkUpdateEnquiryStatus,
  listAdminEnquiries,
  updateEnquiryStatus,
} from '@/lib/api/enquiries';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { AdminSubnav } from '@/components/platform/AdminSubnav';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { ENQUIRY_INTENT_LABELS } from '@/lib/platform/labels';
import type {
  AdminEnquiriesResponse,
  EnquiryIntent,
  EnquiryStatus,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type PartnerOption = { id: string; companyName: string };

const INTENTS = Object.keys(ENQUIRY_INTENT_LABELS) as EnquiryIntent[];

export default function AdminEnquiriesPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <EnquiriesInner />
    </RequireAuth>
  );
}

function EnquiriesInner() {
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | ''>('NEW');
  const [intentFilter, setIntentFilter] = useState<EnquiryIntent | ''>('');
  const [routingFilter, setRoutingFilter] = useState<'' | 'ROUTED' | 'UNROUTED'>('');
  const [data, setData] = useState<AdminEnquiriesResponse | null>(null);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listAdminEnquiries({
      status: statusFilter || undefined,
      intent: intentFilter || undefined,
      routing: routingFilter || undefined,
      take: 50,
    })
      .then((res) => {
        setData(res);
        setSelected(new Set());
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : 'Failed to load enquiries');
        setLoading(false);
      });
  }, [statusFilter, intentFilter, routingFilter]);

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

  async function setStatus(id: string, status: EnquiryStatus) {
    try {
      await updateEnquiryStatus(id, status);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    }
  }

  async function bulk(status: EnquiryStatus) {
    if (selected.size === 0) return;
    try {
      await bulkUpdateEnquiryStatus([...selected], status);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Bulk update failed');
    }
  }

  async function assign(id: string, organizationId: string) {
    try {
      await assignEnquiry(id, organizationId || null);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Routing failed');
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const counts = data?.statusCounts ?? { NEW: 0, READ: 0, CLOSED: 0 };
  const allSelected =
    !!data && data.items.length > 0 && selected.size === data.items.length;

  return (
    <>
      <PlatformPageHeader
        title="Enquiry queue"
        subtitle="Triage inbound leads: filter by source, route to verified partners, and update status in bulk."
      />
      <AdminSubnav />

      <div className="mod-kpi-grid" style={{ marginBottom: '1rem' }}>
        <div className="mod-kpi-card">
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{counts.NEW}</div>
            <div className="mod-kpi-label">New</div>
          </div>
        </div>
        <div className="mod-kpi-card">
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{data?.unroutedNew ?? 0}</div>
            <div className="mod-kpi-label">New &amp; unrouted</div>
          </div>
        </div>
        <div className="mod-kpi-card">
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{counts.READ}</div>
            <div className="mod-kpi-label">Read</div>
          </div>
        </div>
        <div className="mod-kpi-card">
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{counts.CLOSED}</div>
            <div className="mod-kpi-label">Closed</div>
          </div>
        </div>
      </div>

      <div className="platform-card platform-form platform-filter-bar">
        <div>
          <label htmlFor="enquiry-status-filter">Status</label>
          <select
            id="enquiry-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value || '') as EnquiryStatus | '')}
          >
            <option value="">All</option>
            <option value="NEW">New</option>
            <option value="READ">Read</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div>
          <label htmlFor="enquiry-intent-filter">Source</label>
          <select
            id="enquiry-intent-filter"
            value={intentFilter}
            onChange={(e) => setIntentFilter((e.target.value || '') as EnquiryIntent | '')}
          >
            <option value="">All sources</option>
            {INTENTS.map((i) => (
              <option key={i} value={i}>
                {ENQUIRY_INTENT_LABELS[i]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="enquiry-routing-filter">Routing</label>
          <select
            id="enquiry-routing-filter"
            value={routingFilter}
            onChange={(e) =>
              setRoutingFilter((e.target.value || '') as '' | 'ROUTED' | 'UNROUTED')
            }
          >
            <option value="">All</option>
            <option value="UNROUTED">Unrouted (admin queue)</option>
            <option value="ROUTED">Routed to partner</option>
          </select>
        </div>
      </div>

      {error && <div className="platform-card platform-error">{error}</div>}
      {loading && <div className="platform-card">Loading enquiries…</div>}

      {!loading && data && (
        <div className="platform-card">
          {selected.size > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <strong>{selected.size} selected</strong>
              <button
                type="button"
                className="platform-btn platform-btn-secondary platform-btn-sm"
                style={{ marginLeft: '0.75rem' }}
                onClick={() => bulk('READ')}
              >
                Mark read
              </button>
              <button
                type="button"
                className="platform-btn platform-btn-secondary platform-btn-sm"
                style={{ marginLeft: '0.5rem' }}
                onClick={() => bulk('CLOSED')}
              >
                Close
              </button>
            </div>
          )}
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allSelected}
                      onChange={() =>
                        setSelected(
                          allSelected
                            ? new Set()
                            : new Set(data.items.map((r) => r.id)),
                        )
                      }
                    />
                  </th>
                  <th>Received</th>
                  <th>Contact</th>
                  <th>Subject</th>
                  <th>Source</th>
                  <th>Routed to</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={8}>No enquiries in this filter.</td>
                  </tr>
                )}
                {data.items.map((row) => (
                  <Fragment key={row.id}>
                    <tr>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.subject}`}
                          checked={selected.has(row.id)}
                          onChange={() => toggle(row.id)}
                        />
                      </td>
                      <td>{new Date(row.createdAt).toLocaleString('en-IN')}</td>
                      <td>
                        <div>{row.name}</div>
                        <div className="platform-text-muted">{row.email}</div>
                        {row.phone && <div className="platform-text-muted">{row.phone}</div>}
                      </td>
                      <td>
                        {row.subject}
                        {row.listing && (
                          <div className="platform-text-muted">Listing: {row.listing.name}</div>
                        )}
                      </td>
                      <td>
                        {ENQUIRY_INTENT_LABELS[row.intent] ?? row.intent}
                        {row.serviceKey && (
                          <div className="platform-text-muted">{row.serviceKey}</div>
                        )}
                      </td>
                      <td>
                        <select
                          aria-label={`Route ${row.subject}`}
                          value={row.organizationId ?? ''}
                          onChange={(e) => assign(row.id, e.target.value)}
                        >
                          <option value="">Admin queue</option>
                          {partners.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.companyName}
                            </option>
                          ))}
                          {row.organization &&
                            !partners.some((p) => p.id === row.organization!.id) && (
                              <option value={row.organization.id}>
                                {row.organization.companyName}
                              </option>
                            )}
                        </select>
                        {row.lead && (
                          <div className="platform-text-muted">
                            Lead: <StatusBadge status={row.lead.status} />
                          </div>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="platform-btn platform-btn-secondary platform-btn-sm"
                          onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                        >
                          {expandedId === row.id ? 'Hide' : 'View'}
                        </button>
                        {row.status === 'NEW' && (
                          <button
                            type="button"
                            className="platform-btn platform-btn-sm"
                            style={{ marginLeft: '0.5rem' }}
                            onClick={() => setStatus(row.id, 'READ')}
                          >
                            Mark read
                          </button>
                        )}
                        {row.status !== 'CLOSED' && (
                          <button
                            type="button"
                            className="platform-btn platform-btn-secondary platform-btn-sm"
                            style={{ marginLeft: '0.5rem' }}
                            onClick={() => setStatus(row.id, 'CLOSED')}
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === row.id && (
                      <tr>
                        <td colSpan={8}>
                          <p style={{ whiteSpace: 'pre-wrap' }}>{row.message}</p>
                          {row.sourcePage && (
                            <p className="platform-text-muted">Source page: {row.sourcePage}</p>
                          )}
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
    </>
  );
}
