'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { useAuth } from '@/components/platform/AuthProvider';
import type { FulfillmentStatus, OrderDetail } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { formatEnumLabel } from '@/lib/platform/labels';
import { partnerFulfillmentOptions } from '@/lib/platform/fulfillment';
import { StatusBadge } from '@/components/platform/StatusBadge';

type PartnerOrderFulfillmentPanelProps = {
  order: OrderDetail;
  onUpdated: (order: OrderDetail) => void;
};

export function PartnerOrderFulfillmentPanel({
  order,
  onUpdated,
}: PartnerOrderFulfillmentPanelProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<FulfillmentStatus>(
    order.fulfillmentStatus,
  );

  useEffect(() => {
    setSelected(order.fulfillmentStatus);
  }, [order.fulfillmentStatus]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const options = partnerFulfillmentOptions(order.fulfillmentStatus);
  const cancelled = order.status === 'CANCELLED';

  async function applyStatus() {
    if (selected === order.fulfillmentStatus || cancelled) return;
    if (user?.role !== 'PARTNER') {
      setError(
        'Your session is not signed in as a partner. Sign in again with a partner account.',
      );
      return;
    }
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const updated = await apiRequest<OrderDetail>(
        `/partner/orders/${order.id}/fulfillment`,
        {
          method: 'PATCH',
          auth: true,
          body: { fulfillmentStatus: selected },
        },
      );
      onUpdated(updated);
      setMessage('Fulfillment status updated.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(
          err.message === 'Insufficient role'
            ? 'This action requires a verified partner account. Sign out, sign in as partner@garudhub.local (or your partner user), and try again.'
            : err.message,
        );
      } else {
        setError(err instanceof ApiError ? err.message : 'Update failed');
      }
      setSelected(order.fulfillmentStatus);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="platform-card" style={{ marginBottom: '1rem' }}>
      <h3 style={{ marginTop: 0 }}>Fulfillment</h3>
      <p style={{ margin: '0 0 0.75rem' }}>
        Current:{' '}
        <StatusBadge
          status={order.fulfillmentStatus}
          label={formatEnumLabel(order.fulfillmentStatus)}
        />
      </p>
      {cancelled ? (
        <p className="platform-muted" style={{ fontSize: '0.875rem' }}>
          This order was cancelled; fulfillment cannot be updated.
        </p>
      ) : (
        <>
          <div className="platform-field">
            <label htmlFor="fulfillmentStatus">Update status</label>
            <select
              id="fulfillmentStatus"
              value={selected}
              onChange={(e) =>
                setSelected(e.target.value as FulfillmentStatus)
              }
            >
              <option value={order.fulfillmentStatus}>
                {formatEnumLabel(order.fulfillmentStatus)} (current)
              </option>
              {options.map((s) => (
                <option key={s} value={s}>
                  {formatEnumLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="platform-btn platform-btn-cta"
            disabled={
              saving || selected === order.fulfillmentStatus || options.length === 0
            }
            onClick={applyStatus}
          >
            {saving ? 'Saving…' : 'Save fulfillment status'}
          </button>
        </>
      )}
      {error && (
        <p className="platform-error" style={{ marginTop: '0.75rem' }}>
          {error}
        </p>
      )}
      {message && (
        <p className="platform-success" style={{ marginTop: '0.75rem' }}>
          {message}
        </p>
      )}
    </div>
  );
}
