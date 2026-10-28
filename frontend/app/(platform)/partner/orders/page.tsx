'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { DataTable } from '@/components/platform/DataTable';
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
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Incoming orders"
          subtitle="Checkout orders placed against your marketplace listings (offline payment until gateway is live)."
        />
        <div className="platform-form-layout platform-form-layout--full">
          {error && <div className="platform-card platform-error">{error}</div>}
          {rows === null && !error && <PlatformLoading />}
          {rows && rows.length > 0 && (
            <>
              <div className="platform-partner-orders-mobile">
                {rows.map((o) => (
                  <article key={o.id} className="platform-card platform-partner-order-card">
                    <div className="platform-partner-order-card-head">
                      <strong className="platform-font-mono platform-text-sm">
                        {o.id.slice(0, 8)}…
                      </strong>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="platform-text-sm">
                      <strong>{o.buyerCompanyName}</strong>
                    </p>
                    <div className="platform-partner-order-card-meta">
                      <StatusBadge status={o.fulfillmentStatus} />
                      <StatusBadge status={o.paymentStatus} />
                      <span className="platform-muted platform-text-xs">
                        {new Date(o.placedAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="platform-partner-order-card-foot">
                      <span className="platform-text-sm">
                        {formatPrice(false, o.totalInr)}
                      </span>
                      <Link href={`/partner/orders/${o.id}`} className="platform-btn platform-btn-sm">
                        View
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              <div className="platform-partner-orders-desktop">
                <DataTable
                  className="platform-card"
                  tableClassName="platform-table platform-table--partner-orders"
                  aria-label="Partner orders"
                >
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th className="platform-table-col--hide-md">Date</th>
                      <th>Buyer</th>
                      <th className="platform-table-col--hide-md">Lines</th>
                      <th>Status</th>
                      <th>Fulfillment</th>
                      <th className="platform-table-col--hide-md">Payment</th>
                      <th>Total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((o) => (
                      <tr key={o.id}>
                        <td className="platform-font-mono platform-text-sm">
                          {o.id.slice(0, 8)}…
                        </td>
                        <td className="platform-table-col--hide-md">
                          {new Date(o.placedAt).toLocaleDateString('en-IN')}
                        </td>
                        <td>{o.buyerCompanyName}</td>
                        <td className="platform-table-col--hide-md">{o.lineItemCount}</td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                        <td>
                          <StatusBadge status={o.fulfillmentStatus} />
                        </td>
                        <td className="platform-table-col--hide-md">
                          <StatusBadge status={o.paymentStatus} />
                        </td>
                        <td>{formatPrice(false, o.totalInr)}</td>
                        <td className="platform-link-row">
                          <Link href={`/partner/orders/${o.id}`}>View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            </>
          )}
          {rows && rows.length === 0 && !error && (
            <EmptyState
              title="No orders yet"
              description="When buyers checkout with your listings in the cart, orders will appear here."
              primaryAction={{ label: 'Manage catalog', href: '/partner/catalog' }}
              secondaryAction={{ label: 'Preview marketplace', href: '/marketplace' }}
            />
          )}
        </div>
      </div>
    </PartnerPageShell>
  );
}
