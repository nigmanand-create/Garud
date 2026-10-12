'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { EmptyState } from '@/components/platform/EmptyState';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { CATEGORY_LABELS, formatEnumLabel } from '@/lib/platform/labels';
import type { CatalogCategory, RfqStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type InviteRow = {
  id: string;
  status: string;
  rfq: {
    id: string;
    title: string;
    status: RfqStatus;
    category: CatalogCategory;
    createdAt: string;
  };
};

export default function PartnerRfqsPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <RfqsInner />
    </RequireAuth>
  );
}

function RfqsInner() {
  const [rows, setRows] = useState<InviteRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<InviteRow[]>('/partner/rfqs', { auth: true })
      .then(setRows)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load RFQs'),
      );
  }, []);

  return (
    <PartnerPageShell>
      <PlatformPageHeader
        title="RFQ inbox"
        subtitle="Buyer requirements matched to your verified catalog and categories."
      />
      {error && <div className="platform-card platform-error">{error}</div>}
      {rows === null && !error && <PlatformLoading />}
      {rows && rows.length > 0 && (
        <div className="platform-inbox-list">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/partner/rfqs/${r.rfq.id}`}
              className="platform-inbox-item"
            >
              <div className="platform-inbox-item-main">
                <h3>{r.rfq.title}</h3>
                <div className="platform-inbox-item-meta">
                  <span className="platform-badge platform-badge--category">
                    {CATEGORY_LABELS[r.rfq.category]}
                  </span>
                  <StatusBadge status={r.rfq.status} />
                  <span className="platform-muted">
                    Invite · {formatEnumLabel(r.status)}
                  </span>
                </div>
              </div>
              <div className="platform-muted" style={{ fontSize: '0.8125rem' }}>
                {new Date(r.rfq.createdAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
      {rows && rows.length === 0 && !error && (
        <EmptyState
          title="No RFQ invites yet"
          description="When buyers post requirements in your categories, matched invites will appear here for quoting."
          primaryAction={{ label: 'Manage catalog', href: '/partner/catalog' }}
          secondaryAction={{ label: 'Browse marketplace', href: '/marketplace' }}
          icon="✉️"
        />
      )}
    </PartnerPageShell>
  );
}
