'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { AdminSubnav } from '@/components/platform/AdminSubnav';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  assignServiceRequest,
  listAdminServiceRequests,
  rematchServiceRequest,
  setServiceRequestStatus,
  type AdminServiceRequestsResponse,
} from '@/lib/api/service-requests';
import { ApiError } from '@/lib/api/types';
import {
  SERVICE_REQUEST_CATEGORY_LABELS,
  SERVICE_REQUEST_STATUS_LABELS,
  type ServiceRequestCategory,
  type ServiceRequestStatus,
} from '@/lib/platform/verticals';

const STATUSES = Object.keys(SERVICE_REQUEST_STATUS_LABELS) as ServiceRequestStatus[];
const CATEGORIES = Object.keys(SERVICE_REQUEST_CATEGORY_LABELS) as ServiceRequestCategory[];

export default function AdminServiceRequestsPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [status, setStatus] = useState<ServiceRequestStatus | ''>('SUBMITTED');
  const [category, setCategory] = useState<ServiceRequestCategory | ''>('');
  const [data, setData] = useState<AdminServiceRequestsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orgIds, setOrgIds] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setError(null);
    listAdminServiceRequests({ status: status || undefined, category: category || undefined })
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load requests'));
  }, [status, category]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action failed');
    }
  }

  return (
    <div className="platform-partner-form-page">
      <AdminSubnav />
      <PlatformPageHeader
        title="Service requests"
        subtitle="Customer requirements from the service verticals. Unmatched requests land here for manual provider assignment."
      />
      <div className="platform-form-layout platform-form-layout--full">
        {error && <div className="platform-card platform-error">{error}</div>}
        <div className="platform-card platform-form platform-filter-bar">
          <div>
            <label htmlFor="sr-status-filter">Status</label>
            <select
              id="sr-status-filter"
              value={status}
              onChange={(e) => setStatus(e.target.value as ServiceRequestStatus | '')}
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SERVICE_REQUEST_STATUS_LABELS[s]}
                  {data ? ` (${data.statusCounts[s]})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sr-cat-filter">Vertical</label>
            <select
              id="sr-cat-filter"
              value={category}
              onChange={(e) => setCategory(e.target.value as ServiceRequestCategory | '')}
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {SERVICE_REQUEST_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!data && !error && <PlatformLoading />}
        {data && data.items.length === 0 && (
          <div className="platform-card platform-muted">No requests match this filter.</div>
        )}
        {data && data.items.length > 0 && (
          <div className="platform-card">
            <div className="platform-table-wrap">
              <table className="platform-table">
                <thead>
                  <tr>
                    <th>Submitted</th>
                    <th>Requester</th>
                    <th>Vertical</th>
                    <th>Request</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <Fragment key={r.id}>
                      <tr>
                        <td>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                        <td>
                          {r.requesterName}
                          <div className="platform-text-muted">{r.requesterEmail}</div>
                        </td>
                        <td>{SERVICE_REQUEST_CATEGORY_LABELS[r.category]}</td>
                        <td>
                          {r.title}
                          <div className="platform-text-muted">
                            {[r.city, r.state].filter(Boolean).join(', ') || 'No location'}
                            {r.assignedOrganization ? ` · ${r.assignedOrganization.companyName}` : ''}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={r.status} label={SERVICE_REQUEST_STATUS_LABELS[r.status]} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="platform-btn platform-btn-secondary platform-btn-sm"
                            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                          >
                            {expanded === r.id ? 'Hide' : 'Manage'}
                          </button>
                        </td>
                      </tr>
                      {expanded === r.id && (
                        <tr>
                          <td colSpan={6}>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{r.description}</p>
                            {r.matches.length > 0 && (
                              <p className="platform-text-muted">
                                Offered to:{' '}
                                {r.matches
                                  .map((m) => `${m.organization.companyName} (${m.status.toLowerCase()})`)
                                  .join(', ')}
                              </p>
                            )}
                            <ul className="platform-list">
                              {r.updates.map((u) => (
                                <li key={u.id}>
                                  {new Date(u.createdAt).toLocaleString('en-IN')} — {u.actor.toLowerCase()}
                                  {u.note ? `: ${u.note}` : ''}
                                </li>
                              ))}
                            </ul>
                            {(r.status === 'SUBMITTED' || r.status === 'MATCHED') && (
                              <div className="platform-form">
                                <div className="platform-form-actions">
                                  {r.status === 'SUBMITTED' && (
                                    <button
                                      type="button"
                                      className="platform-btn platform-btn-secondary platform-btn-sm"
                                      onClick={() => run(() => rematchServiceRequest(r.id))}
                                    >
                                      Re-run matching
                                    </button>
                                  )}
                                  <input
                                    aria-label="Partner organization ID"
                                    placeholder="Verified partner organization ID"
                                    value={orgIds[r.id] ?? ''}
                                    onChange={(e) => setOrgIds((o) => ({ ...o, [r.id]: e.target.value }))}
                                  />
                                  <button
                                    type="button"
                                    className="platform-btn platform-btn-cta platform-btn-sm"
                                    disabled={!orgIds[r.id]?.trim()}
                                    onClick={() => run(() => assignServiceRequest(r.id, orgIds[r.id].trim()))}
                                  >
                                    Assign provider
                                  </button>
                                </div>
                              </div>
                            )}
                            {r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
                              <div className="platform-form-actions">
                                <button
                                  type="button"
                                  className="platform-btn platform-btn-secondary platform-btn-sm"
                                  onClick={() => run(() => setServiceRequestStatus(r.id, 'CANCELLED'))}
                                >
                                  Cancel request
                                </button>
                                {r.assignedOrganization && (
                                  <button
                                    type="button"
                                    className="platform-btn platform-btn-secondary platform-btn-sm"
                                    onClick={() => run(() => setServiceRequestStatus(r.id, 'COMPLETED'))}
                                  >
                                    Mark completed
                                  </button>
                                )}
                              </div>
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
      </div>
    </div>
  );
}
