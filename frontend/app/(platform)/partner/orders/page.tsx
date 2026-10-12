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
import { formatPrice } from '@/lib/platform/labels';
import type { PartnerOrderListItem } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

export default function PartnerOrdersPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <PartnerOrdersInner />
    </RequireAuth>
  );
}

function PartnerOrdersInner() {
  const [rows, setRows] = useState<PartnerOrderListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<PartnerOrderListItem[]>('/partner/orders', { auth: true })
      .then(setRows)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load orders'),
      );
  }, []);

  return (
    <PartnerPageShell>
      <PlatformPageHeader
        title="Incoming orders"
        subtitle="Checkout orders placed against your marketplace listings (offline payment until gateway is live)."
      />
      {error && <div className="platform-card platform-error">{error}</div>}
      {rows === null && !error && <PlatformLoading />}
      {rows && rows.length > 0 && (
        <div className="platform-card">
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Buyer</th>
                  <th>Lines</th>
                  <th>Status</th>
                  <th>Fulfillment</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id.slice(0, 8)}…</td>
                    <td>{new Date(o.placedAt).toLocaleDateString('en-IN')}</td>
                    <td>{o.buyerCompanyName}</td>
                    <td>{o.lineItemCount}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td><StatusBadge status={o.fulfillmentStatus} /></td>
                    <td><StatusBadge status={o.paymentStatus} /></td>
                    <td>{formatPrice(false, o.totalInr)}</td>
                    <td className="platform-link-row">
                      <Link href={`/partner/orders/${o.id}`}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {rows && rows.length === 0 && !error && (
        <EmptyState
          title="No orders yet"
          description="When buyers checkout with your listings in the cart, orders will appear here."
          primaryAction={{ label: 'Manage catalog', href: '/partner/catalog' }}
          secondaryAction={{ label: 'Preview marketplace', href: '/marketplace' }}
        />
      )}
    </PartnerPageShell>
  );
}
