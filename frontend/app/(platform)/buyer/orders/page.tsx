'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { EmptyState } from '@/components/platform/EmptyState';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { formatPrice } from '@/lib/platform/labels';
import type { OrderListItem } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

export default function BuyerOrdersPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']}>
      <BuyerOrdersInner />
    </RequireAuth>
  );
}

function BuyerOrdersInner() {
  const [rows, setRows] = useState<OrderListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<OrderListItem[]>('/buyer/orders', { auth: true })
      .then(setRows)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load orders'),
      );
  }, []);

  return (
    <>
      <PlatformPageHeader
        title="My orders"
        subtitle="Fixed-price marketplace purchases (pay offline until payment gateway is live)."
        actions={
          <Link href="/buyer/cart" className="platform-btn platform-btn-secondary">
            Cart
          </Link>
        }
      />
      {error && <div className="platform-card platform-error">{error}</div>}
      <div className="platform-card">
        {rows.length === 0 && !error ? (
          <EmptyState
            title="No orders yet"
            description="Place an order from the marketplace cart to see it here."
            primaryAction={{ label: 'Browse marketplace', href: '/marketplace' }}
          />
        ) : (
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vendor</th>
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
                    <td>{new Date(o.placedAt).toLocaleDateString('en-IN')}</td>
                    <td>{o.vendorCompanyName}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td><StatusBadge status={o.fulfillmentStatus} /></td>
                    <td><StatusBadge status={o.paymentStatus} /></td>
                    <td>{formatPrice(false, o.totalInr)}</td>
                    <td className="platform-link-row">
                      <Link href={`/buyer/orders/${o.id}`}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
