'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { AdminSubnav } from '@/components/platform/AdminSubnav';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import type {
  AdminOrdersResponse,
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

export default function AdminOrdersPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <OrdersInner />
    </RequireAuth>
  );
}

function OrdersInner() {
  const [data, setData] = useState<AdminOrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'SHIPPED' | 'FULFILLED' | 'CANCELLED'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  function loadOrders() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();

    if (activeTab === 'CANCELLED') {
      params.set('status', 'CANCELLED');
    } else {
      params.set('status', 'CONFIRMED');
      if (activeTab === 'PENDING') params.set('fulfillmentStatus', 'PENDING');
      if (activeTab === 'SHIPPED') params.set('fulfillmentStatus', 'SHIPPED');
      if (activeTab === 'FULFILLED') params.set('fulfillmentStatus', 'FULFILLED');
    }

    if (paymentFilter) params.set('paymentStatus', paymentFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    params.set('take', '50');

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    apiRequest<AdminOrdersResponse>(`/admin/orders${queryStr}`, { auth: true })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : 'Failed to load orders');
        setLoading(false);
      });
  }

  useEffect(() => {
    loadOrders();
  }, [activeTab, paymentFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadOrders();
  }

  const metrics = data?.metrics || {
    totalGMV: 0,
    totalConfirmedOrders: 0,
    pendingFulfillmentCount: 0,
    pendingPaymentCount: 0,
  };

  return (
    <>
      <PlatformPageHeader
        title="Platform Order Oversight"
        subtitle="Track all B2B drone transactions, gross merchandise value (GMV), vendor fulfillment, and settlement states."
      />
      <AdminSubnav />

      {/* KPI Metric Cards */}
      <div className="mod-kpi-grid">
        <div className="mod-kpi-card" role="region" aria-label="Total GMV">
          <div className="mod-kpi-icon-wrap" style={{ background: '#dcfce7', color: '#15803d' }}>
            ₹
          </div>
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">
              ₹{Number(metrics.totalGMV).toLocaleString('en-IN')}
            </div>
            <div className="mod-kpi-label">Gross Merchandise Value (GMV)</div>
          </div>
        </div>

        <div
          className={`mod-kpi-card ${activeTab === 'ALL' ? 'mod-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('ALL')}
          role="button"
          tabIndex={0}
        >
          <div className="mod-kpi-icon-wrap mod-kpi-icon-wrap--total">📦</div>
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{metrics.totalConfirmedOrders}</div>
            <div className="mod-kpi-label">Total Confirmed Orders</div>
          </div>
        </div>

        <div
          className={`mod-kpi-card ${activeTab === 'PENDING' ? 'mod-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('PENDING')}
          role="button"
          tabIndex={0}
        >
          <div className="mod-kpi-icon-wrap mod-kpi-icon-wrap--pending">⏳</div>
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{metrics.pendingFulfillmentCount}</div>
            <div className="mod-kpi-label">Pending Fulfillment</div>
          </div>
        </div>

        <div
          className="mod-kpi-card"
          onClick={() => setPaymentFilter(paymentFilter === 'PENDING' ? '' : 'PENDING')}
          role="button"
          tabIndex={0}
          style={{ borderColor: paymentFilter === 'PENDING' ? 'var(--platform-accent, #2f5233)' : undefined }}
        >
          <div className="mod-kpi-icon-wrap" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            💳
          </div>
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{metrics.pendingPaymentCount}</div>
            <div className="mod-kpi-label">Pending Wire / RTGS Settlement</div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="mod-tabs-bar">
        <div className="mod-tabs-group">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'PENDING', label: 'Pending Processing' },
            { id: 'SHIPPED', label: 'In Transit / Shipped' },
            { id: 'FULFILLED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`mod-tab-btn ${activeTab === tab.id ? 'mod-tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Controls: Search & Filters */}
      <div className="mod-controls-row">
        <form onSubmit={handleSearchSubmit} className="mod-search-box" style={{ display: 'flex' }}>
          <span className="mod-search-icon">🔍</span>
          <input
            type="text"
            className="mod-search-input"
            placeholder="Search by Order ID, Buyer Org, Vendor Org, or PO number…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <select
          className="mod-filter-select"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter((e.target.value || '') as PaymentStatus | '')}
          aria-label="Filter by payment status"
        >
          <option value="">All payment statuses</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending Payment</option>
          <option value="REFUNDED">Refunded</option>
          <option value="FAILED">Failed</option>
        </select>

        {(searchQuery || paymentFilter || activeTab !== 'ALL') && (
          <button
            type="button"
            className="platform-btn platform-btn--secondary"
            onClick={() => {
              setSearchQuery('');
              setPaymentFilter('');
              setActiveTab('ALL');
            }}
            style={{ fontSize: '0.825rem', height: 40, whiteSpace: 'nowrap' }}
          >
            Reset filters
          </button>
        )}
      </div>

      {error && <div className="platform-card platform-error">{error}</div>}

      {/* Orders Table */}
      <div className="platform-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p className="platform-muted">Loading platform orders…</p>
          </div>
        ) : (
          <>
            <div className="platform-table-wrap">
              <table className="platform-table mod-table">
                <thead>
                  <tr>
                    <th>Order Reference</th>
                    <th>Buyer Enterprise</th>
                    <th>Vendor / Manufacturer</th>
                    <th>Total Value</th>
                    <th>Fulfillment</th>
                    <th>Payment</th>
                    <th>Placed On</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          #{order.id.slice(0, 8)}
                        </div>
                        {order.purchaseOrderNumber && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#64748b',
                              marginTop: 2,
                            }}
                          >
                            PO: {order.purchaseOrderNumber}
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {order.lineItemCount} {order.lineItemCount === 1 ? 'item' : 'items'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--platform-text, #14150f)' }}>
                          {order.buyerOrganization.companyName}
                        </div>
                        <div className="platform-muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                          {[order.buyerOrganization.city, order.buyerOrganization.state].filter(Boolean).join(', ')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {order.contactName} ({order.buyerUser.email})
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--platform-text, #14150f)' }}>
                          {order.vendorOrganization.companyName}
                        </div>
                        <div className="platform-muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                          {[order.vendorOrganization.city, order.vendorOrganization.state].filter(Boolean).join(', ')}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                          ₹{Number(order.totalInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {Number(order.taxInr) > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Incl. 18% GST (₹{Number(order.taxInr).toLocaleString('en-IN')})
                          </div>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={order.fulfillmentStatus} />
                      </td>
                      <td>
                        <StatusBadge status={order.paymentStatus} />
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(order.placedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="mod-review-btn"
                        >
                          Inspect →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(!data || data.items.length === 0) && !error && (
              <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>No orders found</h3>
                <p className="platform-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                  {searchQuery
                    ? `No orders match query "${searchQuery}".`
                    : 'There are currently no orders in this status category.'}
                </p>
                {(searchQuery || paymentFilter || activeTab !== 'ALL') && (
                  <button
                    type="button"
                    className="platform-btn platform-btn--secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setPaymentFilter('');
                      setActiveTab('ALL');
                    }}
                    style={{ marginTop: '1rem', fontSize: '0.85rem' }}
                  >
                    Clear search filters
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
