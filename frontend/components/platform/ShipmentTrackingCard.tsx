'use client';

import React, { useState } from 'react';
import type { OrderDetail } from '@/lib/api/types';

type ShipmentTrackingCardProps = {
  order: OrderDetail;
};

export function ShipmentTrackingCard({ order }: ShipmentTrackingCardProps) {
  const [copied, setCopied] = useState(false);

  const hasTracking = Boolean(order.trackingNumber || order.carrierName);

  function copyTracking() {
    if (!order.trackingNumber) return;
    navigator.clipboard.writeText(order.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Generate fallback tracking url for common couriers if trackingUrl is empty
  function getEffectiveTrackingUrl(): string | null {
    if (order.trackingUrl) return order.trackingUrl;
    if (!order.trackingNumber) return null;

    const carrier = order.carrierName?.toLowerCase() || '';
    if (carrier.includes('bluedart') || carrier.includes('blue dart')) {
      return `https://www.bluedart.com/tracking?track=${encodeURIComponent(order.trackingNumber)}`;
    }
    if (carrier.includes('delhivery')) {
      return `https://www.delhivery.com/track/package/${encodeURIComponent(order.trackingNumber)}`;
    }
    if (carrier.includes('dtdc')) {
      return `https://www.dtdc.in/tracking/shipment-tracking.asp?trkNo=${encodeURIComponent(order.trackingNumber)}`;
    }
    if (carrier.includes('india post') || carrier.includes('speed post')) {
      return `https://www.indiapost.gov.in/_layouts/15/dpt.cpt.application/consignmenttracking.aspx`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(
      `${order.carrierName || 'courier'} tracking ${order.trackingNumber}`,
    )}`;
  }

  const trackingUrl = getEffectiveTrackingUrl();

  if (!hasTracking && order.fulfillmentStatus === 'PENDING') {
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
            }}
          >
            📦
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
              Fulfillment In Queue
            </h4>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              The partner vendor is preparing your order for dispatch. Tracking details and hardware serial numbers will appear here upon shipment.
            </p>
          </div>
        </div>
      </div>
    );
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
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
            }}
          >
            🚚
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {order.carrierName || 'Express Logistics Carrier'}
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: 12,
                  background: order.fulfillmentStatus === 'FULFILLED' ? '#dcfce7' : '#dbeafe',
                  color: order.fulfillmentStatus === 'FULFILLED' ? '#166534' : '#1e40af',
                }}
              >
                {order.fulfillmentStatus === 'FULFILLED' ? 'DELIVERED' : 'DISPATCHED'}
              </span>
            </div>
            {order.trackingNumber && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.25rem',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tracking / AWB:</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: '#0f172a',
                    background: '#f8fafc',
                    padding: '0.1rem 0.4rem',
                    borderRadius: 4,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {order.trackingNumber}
                </span>
                <button
                  type="button"
                  onClick={copyTracking}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: copied ? '#16a34a' : '#2563eb',
                    fontWeight: 600,
                    padding: '0.15rem 0.4rem',
                    borderRadius: 4,
                  }}
                  title="Copy tracking number"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        </div>

        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="platform-btn platform-btn-cta"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            <span>Live Carrier Tracking</span>
            <span style={{ fontSize: '1rem' }}>↗</span>
          </a>
        )}
      </div>

      {/* Dates Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        {order.dispatchedAt && (
          <div
            style={{
              padding: '0.75rem',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              Dispatched On
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginTop: '0.2rem' }}>
              {new Date(order.dispatchedAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>
          </div>
        )}

        {order.estimatedDeliveryAt && (
          <div
            style={{
              padding: '0.75rem',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              Estimated Delivery
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginTop: '0.2rem' }}>
              {new Date(order.estimatedDeliveryAt).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        )}

        {order.deliveredAt && (
          <div
            style={{
              padding: '0.75rem',
              background: '#f0fdf4',
              borderRadius: 8,
              border: '1px solid #bbf7d0',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 500 }}>
              Delivered At
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#166534', marginTop: '0.2rem' }}>
              {new Date(order.deliveredAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>
          </div>
        )}
      </div>

      {/* Hardware Serial Numbers Section */}
      {order.hardwareSerialNumbers && order.hardwareSerialNumbers.length > 0 && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#475569',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>🛡️ Hardware Serial Numbers (Avionics & Components)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {order.hardwareSerialNumbers.map((sn, i) => (
              <span
                key={i}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  background: '#f1f5f9',
                  color: '#0f172a',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>#{i + 1}</span>
                <span>{sn}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fulfillment Notes */}
      {order.fulfillmentNotes && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem 1rem',
            background: '#fafafa',
            borderRadius: 8,
            borderLeft: '3px solid #2f5233',
            fontSize: '0.825rem',
            color: '#334155',
          }}
        >
          <strong>Dispatch Note:</strong> {order.fulfillmentNotes}
        </div>
      )}
    </div>
  );
}
