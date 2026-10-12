'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { EmptyState } from '@/components/platform/EmptyState';
import { CATEGORY_LABELS, formatEnumLabel } from '@/lib/platform/labels';
import type { CatalogCategory, RfqStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type RfqRow = {
  id: string;
  title: string;
  status: RfqStatus;
  category: CatalogCategory;
  createdAt: string;
  _count: { invites: number; quotations: number };
};

export default function BuyerRfqsPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']}>
      <BuyerRfqsInner />
    </RequireAuth>
  );
}

function BuyerRfqsInner() {
  const [rows, setRows] = useState<RfqRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<RfqRow[]>('/rfq', { auth: true })
      .then(setRows)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load RFQs'),
      );
  }, []);

  return (
    <>
      <PlatformPageHeader
        title="My RFQs"
        subtitle="Post requirements and compare quotations from verified partners."
        actions={
          <Link href="/buyer/rfqs/new" className="platform-btn platform-btn-cta">
            Post new RFQ
          </Link>
        }
      />
      {error && <div className="platform-card platform-error">{error}</div>}
      <div className="platform-card">
        <div className="platform-table-wrap">
        <table className="platform-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Invites</th>
              <th>Quotes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{CATEGORY_LABELS[r.category]}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{r._count.invites}</td>
                <td>{r._count.quotations}</td>
                <td className="platform-link-row">
                  <Link href={`/buyer/rfqs/${r.id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {rows.length === 0 && !error && (
          <EmptyState
            title="No RFQs yet"
            description="Post your first requirement to invite matched vendors and compare quotes in one place."
            primaryAction={{ label: 'Post new RFQ', href: '/buyer/rfqs/new' }}
            secondaryAction={{ label: 'Browse marketplace', href: '/marketplace' }}
          />
        )}
      </div>
    </>
  );
}
