'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { formatEnumLabel } from '@/lib/platform/labels';
import type { VerificationStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type ApplicationRow = {
  id: string;
  companyName: string;
  verificationStatus: VerificationStatus;
  submittedAt?: string | null;
  owner: { email: string; accountType: string };
  _count: { documents: number };
};

export default function AdminApplicationsPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <ApplicationsInner />
    </RequireAuth>
  );
}

function ApplicationsInner() {
  const [status, setStatus] = useState<VerificationStatus | ''>('SUBMITTED');
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = status ? `?status=${status}` : '';
    apiRequest<ApplicationRow[]>(`/admin/applications${q}`, { auth: true })
      .then((res) => {
        setRows(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : 'Failed to load');
        setLoading(false);
      });
  }, [status]);

  return (
    <div className="platform-admin-list-page">
      <PlatformPageHeader
        title="Partner applications"
        subtitle="Review and approve verification requests from the admin queue."
      />

      <div className="platform-card platform-form platform-filter-bar">
        <div>
          <label htmlFor="app-status-filter">Filter by status</label>
          <select
            id="app-status-filter"
            className="mod-filter-select"
            value={status}
            onChange={(e) =>
              setStatus((e.target.value || '') as VerificationStatus | '')
            }
          >
            <option value="">All</option>
            {(
              [
                'DRAFT',
                'SUBMITTED',
                'UNDER_REVIEW',
                'APPROVED',
                'REJECTED',
              ] as VerificationStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {formatEnumLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="platform-card platform-error">{error}</div>}

      <div className="platform-card platform-card--flush">
        {loading ? (
          <div className="platform-loading-center">
            <p className="platform-muted">Loading applications…</p>
          </div>
        ) : (
          <>
            <div className="platform-table-wrap">
              <table className="platform-table mod-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Owner</th>
                    <th>Status</th>
                    <th>Docs</th>
                    <th>Submitted</th>
                    <th className="platform-table-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6}>No applications in this filter.</td>
                    </tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.companyName}</td>
                      <td>{r.owner.email}</td>
                      <td>
                        <StatusBadge status={r.verificationStatus} />
                      </td>
                      <td>{r._count.documents}</td>
                      <td>
                        {r.submittedAt
                          ? new Date(r.submittedAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="platform-table-actions-row">
                        <Link
                          href={`/admin/applications/${r.id}`}
                          className="mod-review-btn"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
