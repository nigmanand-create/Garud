'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { useAuth } from '@/components/platform/AuthProvider';
import type {
  FulfillmentStatus,
  OrderDetail,
  UpdateOrderFulfillmentPayload,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { formatEnumLabel } from '@/lib/platform/labels';
import { StatusBadge } from '@/components/platform/StatusBadge';

type PartnerOrderFulfillmentPanelProps = {
  order: OrderDetail;
  onUpdated: (order: OrderDetail) => void;
};

const COURIER_PRESETS = [
  { name: 'BlueDart Aviation', trackingPrefix: 'https://www.bluedart.com/tracking?track=' },
  { name: 'Delhivery Surface/Air', trackingPrefix: 'https://www.delhivery.com/track/package/' },
  { name: 'DTDC Express', trackingPrefix: 'https://www.dtdc.in/tracking/shipment-tracking.asp?trkNo=' },
  { name: 'India Post Speed Post', trackingPrefix: 'https://www.indiapost.gov.in/_layouts/15/dpt.cpt.application/consignmenttracking.aspx?track=' },
  { name: 'DHL Express India', trackingPrefix: 'https://www.dhl.com/in-en/home/tracking.html?tracking-id=' },
  { name: 'Shadowfax Tech', trackingPrefix: 'https://tracker.shadowfax.in/#/' },
  { name: 'Dedicated Fleet / Hand Delivery', trackingPrefix: '' },
];

export function PartnerOrderFulfillmentPanel({
  order,
  onUpdated,
}: PartnerOrderFulfillmentPanelProps) {
  const { user } = useAuth();

  const [selectedStatus, setSelectedStatus] = useState<FulfillmentStatus>(
    order.fulfillmentStatus,
  );
  const [carrierName, setCarrierName] = useState(order.carrierName || '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || '');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(
    order.estimatedDeliveryAt ? order.estimatedDeliveryAt.split('T')[0] : '',
  );
  const [serialNumbersRaw, setSerialNumbersRaw] = useState(
    order.hardwareSerialNumbers ? order.hardwareSerialNumbers.join(', ') : '',
  );
  const [fulfillmentNotes, setFulfillmentNotes] = useState(
    order.fulfillmentNotes || '',
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStatus(order.fulfillmentStatus);
    setCarrierName(order.carrierName || '');
    setTrackingNumber(order.trackingNumber || '');
    setTrackingUrl(order.trackingUrl || '');
    setEstimatedDeliveryDate(
      order.estimatedDeliveryAt ? order.estimatedDeliveryAt.split('T')[0] : '',
    );
    setSerialNumbersRaw(
      order.hardwareSerialNumbers ? order.hardwareSerialNumbers.join(', ') : '',
    );
    setFulfillmentNotes(order.fulfillmentNotes || '');
  }, [order]);

  const cancelled = order.status === 'CANCELLED';

  function handleCarrierSelect(name: string) {
    setCarrierName(name);
    const preset = COURIER_PRESETS.find((c) => c.name === name);
    if (preset && preset.trackingPrefix && trackingNumber) {
      setTrackingUrl(`${preset.trackingPrefix}${trackingNumber.trim()}`);
    }
  }

  function handleTrackingNumberChange(num: string) {
    setTrackingNumber(num);
    const preset = COURIER_PRESETS.find((c) => c.name === carrierName);
    if (preset && preset.trackingPrefix && num) {
      setTrackingUrl(`${preset.trackingPrefix}${num.trim()}`);
    }
  }

  async function handleSaveFulfillment(e: React.FormEvent) {
    e.preventDefault();
    if (cancelled) return;
    if (user?.role !== 'PARTNER') {
      setError('Your session is not signed in as a partner.');
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      // Parse serial numbers
      const serials = serialNumbersRaw
        ? serialNumbersRaw
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const payload: UpdateOrderFulfillmentPayload = {
        fulfillmentStatus: selectedStatus,
        carrierName: carrierName.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        trackingUrl: trackingUrl.trim() || undefined,
        hardwareSerialNumbers: serials,
        fulfillmentNotes: fulfillmentNotes.trim() || undefined,
        estimatedDeliveryAt: estimatedDeliveryDate
          ? new Date(estimatedDeliveryDate).toISOString()
          : undefined,
      };

      const updated = await apiRequest<OrderDetail>(
        `/partner/orders/${order.id}/fulfillment`,
        {
          method: 'PATCH',
          auth: true,
          body: payload,
        },
      );

      onUpdated(updated);
      setSuccess('Fulfillment & dispatch tracking updated successfully!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(
          'This action requires verified partner permissions. Check your partner access.',
        );
      } else {
        setError(err instanceof ApiError ? err.message : 'Update failed');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            Dispatch & Fulfillment Operations
          </h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.825rem', color: '#64748b' }}>
            Manage shipment progress, courier tracking AWB, and allocate hardware serial numbers.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Current:</span>
          <StatusBadge
            status={order.fulfillmentStatus}
            label={formatEnumLabel(order.fulfillmentStatus)}
          />
        </div>
      </div>

      {cancelled ? (
        <div
          style={{
            padding: '1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          This order has been cancelled. Fulfillment updates are disabled.
        </div>
      ) : (
        <form onSubmit={handleSaveFulfillment}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            {/* Status Selector */}
            <div className="platform-field">
              <label htmlFor="fulfillmentStatusSelect" style={{ fontWeight: 600 }}>
                Fulfillment Stage *
              </label>
              <select
                id="fulfillmentStatusSelect"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as FulfillmentStatus)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: 6 }}
              >
                <option value="PENDING">PENDING — In Queue</option>
                <option value="PROCESSING">PROCESSING — Quality Testing & Packing</option>
                <option value="SHIPPED">SHIPPED — Handed over to Courier / Transit</option>
                <option value="FULFILLED">FULFILLED — Delivered & Handover Complete</option>
              </select>
            </div>

            {/* Carrier Name */}
            <div className="platform-field">
              <label htmlFor="carrierInput" style={{ fontWeight: 600 }}>
                Logistics Carrier / Courier
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="carrierInput"
                  type="text"
                  placeholder="e.g. BlueDart Aviation, Delhivery"
                  value={carrierName}
                  onChange={(e) => handleCarrierSelect(e.target.value)}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: 6 }}
                />
                <select
                  aria-label="Courier presets"
                  onChange={(e) => {
                    if (e.target.value) handleCarrierSelect(e.target.value);
                  }}
                  value=""
                  style={{ width: 110, padding: '0.6rem', borderRadius: 6, fontSize: '0.8rem' }}
                >
                  <option value="" disabled>
                    Presets…
                  </option>
                  {COURIER_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tracking / AWB Number */}
            <div className="platform-field">
              <label htmlFor="trackingInput" style={{ fontWeight: 600 }}>
                Tracking ID / Consignment AWB
              </label>
              <input
                id="trackingInput"
                type="text"
                placeholder="e.g. BD78923410IN or DEL12345678"
                value={trackingNumber}
                onChange={(e) => handleTrackingNumberChange(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: 6 }}
              />
            </div>

            {/* Estimated Delivery Date */}
            <div className="platform-field">
              <label htmlFor="deliveryDateInput" style={{ fontWeight: 600 }}>
                Estimated Delivery Date
              </label>
              <input
                id="deliveryDateInput"
                type="date"
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: 6 }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            {/* Tracking URL */}
            <div className="platform-field">
              <label htmlFor="trackingUrlInput" style={{ fontWeight: 600 }}>
                Live Tracking URL (Carrier Web Portal)
              </label>
              <input
                id="trackingUrlInput"
                type="url"
                placeholder="https://..."
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: 6 }}
              />
            </div>

            {/* Hardware Serial Numbers */}
            <div className="platform-field">
              <label htmlFor="serialsInput" style={{ fontWeight: 600 }}>
                Hardware Serial Numbers (Comma or line separated)
              </label>
              <input
                id="serialsInput"
                type="text"
                placeholder="e.g. SN-UAV-001, SN-FC-984, BAT-48V-102"
                value={serialNumbersRaw}
                onChange={(e) => setSerialNumbersRaw(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: 6 }}
              />
            </div>
          </div>

          {/* Fulfillment Notes */}
          <div className="platform-field" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="notesInput" style={{ fontWeight: 600 }}>
              Fulfillment & Dispatch Notes (Visible to Buyer)
            </label>
            <textarea
              id="notesInput"
              rows={2}
              placeholder="e.g. Fragile payload packaged in shock-absorbent military flight case. Includes calibrated flight controller."
              value={fulfillmentNotes}
              onChange={(e) => setFulfillmentNotes(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: 6 }}
            />
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="platform-btn platform-btn-cta"
              disabled={saving}
              style={{ padding: '0.65rem 1.4rem', fontSize: '0.95rem' }}
            >
              {saving ? 'Saving Updates…' : 'Update Fulfillment & Tracking'}
            </button>

            {success && (
              <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.875rem' }}>
                ✓ {success}
              </span>
            )}
            {error && (
              <span style={{ color: '#991b1b', fontWeight: 600, fontSize: '0.875rem' }}>
                ✕ {error}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
