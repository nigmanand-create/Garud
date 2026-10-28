'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth, useAuth } from '@/components/platform/AuthProvider';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { formatPrice } from '@/lib/platform/labels';
import type { OrderDetail } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { PartnerOrderFulfillmentPanel } from '@/components/platform/PartnerOrderFulfillmentPanel';
import { OrderProgressStepper } from '@/components/platform/OrderProgressStepper';
import { formatEnumLabel } from '@/lib/platform/labels';

export default function PartnerOrderDetailPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <PartnerOrderDetailInner />
    </RequireAuth>
  );
}

function PartnerOrderDetailInner() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'PARTNER') return;
    apiRequest<OrderDetail>(`/partner/orders/${id}`, { auth: true })
      .then(setOrder)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Order not found'),
      );
  }, [id, user?.id, user?.role]);

  if (error) {
    return (
      <PartnerPageShell>
        <div className="platform-card platform-error">{error}</div>
      </PartnerPageShell>
    );
  }
  if (!order) {
    return (
      <PartnerPageShell>
        <div className="platform-grid" aria-busy="true">
          <div className="platform-skeleton platform-skeleton-bar" style={{ width: '50%' }} />
        </div>
      </PartnerPageShell>
    );
  }

  return (
    <PartnerPageShell>
      <PlatformPageHeader
        title={`Order ${order.id.slice(0, 8)}…`}
        subtitle={
          <>
            Placed {new Date(order.placedAt).toLocaleString('en-IN')} ·{' '}
            {order.companyName} · {order.contactName}
            {order.rfqId && (
              <>
                {' '}·{' '}
                <Link href={`/partner/rfqs/${order.rfqId}`} className="platform-inline-link">
                  Procured via RFQ ↗
                </Link>
              </>
            )}
          </>
        }
        backHref="/partner/orders"
        backLabel="Incoming orders"
      />

      <OrderProgressStepper order={order} />

      <PartnerOrderFulfillmentPanel order={order} onUpdated={setOrder} />

      <div className="platform-detail-layout">
        <div className="platform-card">
          <p className="platform-status-row">
            <StatusBadge status={order.status} />{' '}
            <StatusBadge
              status={order.fulfillmentStatus}
              label={`Fulfillment: ${formatEnumLabel(order.fulfillmentStatus)}`}
            />{' '}
            <StatusBadge status={order.paymentStatus} />
          </p>
          <h3 className="platform-section-heading">Line items</h3>
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
                      <div className="platform-line-item-cell">
                        <div className="platform-line-item-thumb">
                          {li.imageUrl ? (
                            <img src={li.imageUrl} alt={li.name} />
                          ) : (
                            <span aria-hidden>🛸</span>
                          )}
                        </div>
                        <div>
                          {li.listingId ? (
                            <Link
                              href={`/partner/catalog/${li.listingId}`}
                              className="platform-line-item-title"
                            >
                              {li.name}
                            </Link>
                          ) : (
                            <span className="platform-font-semibold">{li.name}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="platform-font-mono platform-text-sm">{li.sku ?? '—'}</td>
                    <td>{li.quantity}</td>
                    <td>{formatPrice(false, li.unitPriceInr)}</td>
                    <td className="platform-font-semibold">{formatPrice(false, li.lineTotalInr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="platform-order-total">
            Total: {formatPrice(false, order.totalInr)}
          </p>
        </div>

        <aside>
          <div className="platform-card platform-prose">
            <h3 className="platform-section-heading">Shipping</h3>
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
                <h3 className="platform-section-heading platform-mt-md">GSTIN</h3>
                <p>{order.gstin}</p>
              </>
            )}
            {order.purchaseOrderNumber && (
              <>
                <h3 className="platform-section-heading platform-mt-md">PO number</h3>
                <p>{order.purchaseOrderNumber}</p>
              </>
            )}
            <p className="platform-muted platform-text-xs platform-mt-md">
              Offline payment: contact the buyer to complete payment and arrange fulfillment.
            </p>
          </div>
        </aside>
      </div>
    </PartnerPageShell>
  );
}
