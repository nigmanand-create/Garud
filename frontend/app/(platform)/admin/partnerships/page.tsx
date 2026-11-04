'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  decidePartnershipRequest,
  listAdminPartnerships,
  type AdminPartnershipsResponse,
  type PartnershipRequestStatus,
} from '@/lib/api/partnerships';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { AdminSubnav } from '@/components/platform/AdminSubnav';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  PARTNERSHIP_STATUS_LABELS,
  PARTNERSHIP_TYPE_LABELS,
} from '@/lib/platform/labels';
import { ApiError } from '@/lib/api/types';

const STATUSES = Object.keys(PARTNERSHIP_STATUS_LABELS) as PartnershipRequestStatus[];

export default function AdminPartnershipsPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <PartnershipsInner />
    </RequireAuth>
  );
}

function PartnershipsInner() {
  const [filter, setFilter] = useState<PartnershipRequestStatus | ''>('SUBMITTED');
  const [data, setData] = useState<AdminPartnershipsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setError(null);
    listAdminPartnerships(filter || undefined)
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load requests'),
      );
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, status: 'UNDER_REVIEW' | 'APPROVED' | 'DECLINED') {
    try {
      await decidePartnershipRequest(id, { status, adminNote: notes[id] || undefined });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    }
  }

  return (
    <div className="platform-partner-form-page">
      <AdminSubnav />
      <PlatformPageHeader
        title="Partnership requests"
        subtitle="Review distributor, dealer, OEM and technology partnership requests from verified partners."
      />
      <div className="platform-form-layout platform-form-layout--full">
        {error && <div className="platform-card platform-error">{error}</div>}

        <div className="platform-card platform-form platform-filter-bar">
          <div>
            <label htmlFor="pr-status-filter">Status</label>
            <select
              id="pr-status-filter"
              value={filter}
              onChange={(e) => setFilter((e.target.value || '') as PartnershipRequestStatus | '')}
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PARTNERSHIP_STATUS_LABELS[s]}
                  {data ? ` (${data.statusCounts[s]})` : ''}
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
                    <th>Partner</th>
                    <th>Type</th>
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
                          {r.organization.companyName}
                          <div className="platform-text-muted">{r.organization.contactEmail}</div>
                        </td>
                        <td>{PARTNERSHIP_TYPE_LABELS[r.type]}</td>
                        <td>
                          {r.title}
                          {r.targetOrganization && (
                            <div className="platform-text-muted">
                              Target: {r.targetOrganization.companyName}
                            </div>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={r.status} label={PARTNERSHIP_STATUS_LABELS[r.status]} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="platform-btn platform-btn-secondary platform-btn-sm"
                            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                          >
                            {expanded === r.id ? 'Hide' : 'Review'}
                          </button>
                        </td>
                      </tr>
                      {expanded === r.id && (
                        <tr>
                          <td colSpan={6}>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{r.message}</p>
                            {r.regions && <p className="platform-text-muted">Regions: {r.regions}</p>}
                            {r.status !== 'WITHDRAWN' && (
                              <div className="platform-form">
                                <label htmlFor={`note-${r.id}`}>Note to partner</label>
                                <textarea
                                  id={`note-${r.id}`}
                                  rows={2}
                                  maxLength={2000}
                                  value={notes[r.id] ?? r.adminNote ?? ''}
                                  onChange={(e) =>
                                    setNotes((n) => ({ ...n, [r.id]: e.target.value }))
                                  }
                                />
                                <div className="platform-form-actions">
                                  <button
                                    type="button"
                                    className="platform-btn platform-btn-cta platform-btn-sm"
                                    onClick={() => decide(r.id, 'APPROVED')}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="platform-btn platform-btn-secondary platform-btn-sm"
                                    onClick={() => decide(r.id, 'UNDER_REVIEW')}
                                  >
                                    Mark under review
                                  </button>
                                  <button
                                    type="button"
                                    className="platform-btn platform-btn-secondary platform-btn-sm"
                                    onClick={() => decide(r.id, 'DECLINED')}
                                  >
                                    Decline
                                  </button>
                                </div>
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
