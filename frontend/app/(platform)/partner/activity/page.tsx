'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPartnerAuditLog, type PartnerAuditEvent } from '@/lib/api/partner-hub';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { EmptyState } from '@/components/platform/EmptyState';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { ApiError } from '@/lib/api/types';

export default function PartnerActivityPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <ActivityInner />
    </RequireAuth>
  );
}

function ActivityInner() {
  const [items, setItems] = useState<PartnerAuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPartnerAuditLog(100)
      .then((r) => setItems(r.items))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load activity'),
      );
  }, []);

  return (
    <PartnerPageShell>
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Activity log"
          subtitle="Verification (KYC) and listing moderation decisions for your organization."
        />
        <div className="platform-form-layout platform-form-layout--full">
          {error && <div className="platform-card platform-error">{error}</div>}
          {!items && !error && <PlatformLoading />}
          {items && items.length === 0 && (
            <EmptyState
              title="No activity yet"
              description="Verification and listing review events appear here once you submit your application or a listing."
              primaryAction={{ label: 'Open application', href: '/partner/application' }}
              icon="🗒️"
            />
          )}
          {items && items.length > 0 && (
            <div className="platform-card">
              <div className="platform-table-wrap">
                <table className="platform-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Area</th>
                      <th>Change</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((e) => (
                      <tr key={`${e.kind}-${e.id}`}>
                        <td>{new Date(e.createdAt).toLocaleString('en-IN')}</td>
                        <td>
                          {e.kind === 'KYC' ? (
                            'Verification'
                          ) : e.listingId ? (
                            <Link href={`/partner/catalog/${e.listingId}`}>
                              {e.listingName ?? 'Listing'}
                            </Link>
                          ) : (
                            'Listing'
                          )}
                        </td>
                        <td>
                          <StatusBadge status={e.fromStatus} /> → <StatusBadge status={e.toStatus} />
                        </td>
                        <td>{e.note ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </PartnerPageShell>
  );
}
