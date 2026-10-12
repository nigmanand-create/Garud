'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { formatPrice } from '@/lib/platform/labels';
import { fulfillmentTimelineText } from '@/lib/platform/fulfillment';
import type { OrderDetail } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

export default function BuyerOrderDetailPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']}>
      <BuyerOrderDetailInner />
    </RequireAuth>
  );
}

function BuyerOrderDetailInner() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<OrderDetail>(`/buyer/orders/${id}`, { auth: true })
      .then(setOrder)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Order not found'),
      );
  }, [id]);

  if (error) {
    return <div className="platform-card platform-error">{error}</div>;
  }
  if (!order) {
    return (
      <div className="platform-grid" aria-busy="true">
        <div className="platform-skeleton" style={{ height: 28, width: '50%' }} />
      </div>
    );
  }

  return (
    <>
      <PlatformPageHeader
        title={`Order ${order.id.slice(0, 8)}…`}
        subtitle={
          <>
            Placed {new Date(order.placedAt).toLocaleString('en-IN')} ·{' '}
            {order.vendorOrganization.companyName}
          </>
        }
        backHref="/buyer/orders"
        backLabel="My orders"
      />

      <div className="platform-detail-layout">
        <div className="platform-card">
          <p style={{ margin: '0 0 0.75rem' }}>
            <StatusBadge status={order.status} />{' '}
            <StatusBadge status={order.fulfillmentStatus} />{' '}
            <StatusBadge status={order.paymentStatus} />
          </p>
          <p className="platform-muted" style={{ fontSize: '0.875rem' }}>
            {fulfillmentTimelineText(order.fulfillmentStatus)}
          </p>
          <h3 style={{ marginTop: 0 }}>Line items</h3>
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.lineItems.map((li) => (
                  <tr key={li.id}>
                    <td>
                      <Link href={`/marketplace/listings/${li.listingId}`}>{li.name}</Link>
                    </td>
                    <td>{li.sku ?? '—'}</td>
                    <td>{li.quantity}</td>
                    <td>{formatPrice(false, li.unitPriceInr)}</td>
                    <td>{formatPrice(false, li.lineTotalInr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '1rem 0 0', fontWeight: 700 }}>
            Total: {formatPrice(false, order.totalInr)}
          </p>
        </div>

        <aside>
          <div className="platform-card platform-prose">
            <h3 style={{ marginTop: 0 }}>Shipping</h3>
            <p style={{ margin: 0 }}>
              {order.companyName}<br />
              {order.contactName} · {order.contactPhone}<br />
              {order.shipping.addressLine1}
              {order.shipping.addressLine2 ? `, ${order.shipping.addressLine2}` : ''}
              <br />
              {order.shipping.city}, {order.shipping.state} {order.shipping.pincode}
              <br />
              {order.shipping.country}
            </p>
            {order.gstin && (
              <>
                <h3>GSTIN</h3>
                <p>{order.gstin}</p>
              </>
            )}
            {order.purchaseOrderNumber && (
              <>
                <h3>PO number</h3>
                <p>{order.purchaseOrderNumber}</p>
              </>
            )}
            <p className="platform-muted" style={{ fontSize: '0.8125rem' }}>
              Offline payment: the seller will contact you to complete payment and fulfillment.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
