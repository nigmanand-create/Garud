'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { AdminSubnav } from '@/components/platform/AdminSubnav';
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
      <AdminInner />
    </RequireAuth>
  );
}

function AdminInner() {
  const [status, setStatus] = useState<VerificationStatus | ''>('SUBMITTED');
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = status ? `?status=${status}` : '';
    apiRequest<ApplicationRow[]>(`/admin/applications${q}`, { auth: true })
      .then(setRows)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load'),
      );
  }, [status]);

  return (
    <>
      <PlatformPageHeader
        title="Partner applications"
        subtitle="Review and approve verification requests from the admin queue."
      />
      <AdminSubnav />
      <div className="platform-card platform-form platform-filter-bar">
        <div>
        <label>Filter by status</label>
        <select
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
      <div className="platform-card">
        <div className="platform-table-wrap">
        <table className="platform-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Docs</th>
              <th>Submitted</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.companyName}</td>
                <td>{r.owner.email}</td>
                <td><StatusBadge status={r.verificationStatus} /></td>
                <td>{r._count.documents}</td>
                <td>
                  {r.submittedAt
                    ? new Date(r.submittedAt).toLocaleDateString()
                    : '—'}
                </td>
                <td className="platform-link-row">
                  <Link href={`/admin/applications/${r.id}`}>Review</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {rows.length === 0 && !error && (
          <p className="platform-muted">No applications in this filter.</p>
        )}
      </div>
    </>
  );
}
