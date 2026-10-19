'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { AdminSubnav } from '@/components/platform/AdminSubnav';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { CATEGORY_LABELS, formatEnumLabel, formatPrice } from '@/lib/platform/labels';
import type { AdminListingSummary, AdminListingsResponse, CatalogCategory, ListingReviewStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

export default function AdminListingsQueuePage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <ListingsQueueInner />
    </RequireAuth>
  );
}

function ListingsQueueInner() {
  const [status, setStatus] = useState<ListingReviewStatus | ''>('PENDING_REVIEW');
  const [category, setCategory] = useState<CatalogCategory | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<AdminListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    params.set('take', '100');

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    apiRequest<AdminListingsResponse>(`/admin/listings${queryStr}`, { auth: true })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : 'Failed to load listings');
        setLoading(false);
      });
  }, [status, category]);

  // Client-side search filtering across title, brand, sku, company name
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (!searchQuery.trim()) return data.items;
    const q = searchQuery.toLowerCase().trim();
    return data.items.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(q);
      const brandMatch = item.brand?.toLowerCase().includes(q);
      const skuMatch = item.sku?.toLowerCase().includes(q);
      const companyMatch = item.organization.companyName.toLowerCase().includes(q);
      return nameMatch || brandMatch || skuMatch || companyMatch;
    });
  }, [data?.items, searchQuery]);

  const counts = data?.statusCounts || {};
  const pendingCount = counts.PENDING_REVIEW ?? 0;
  const approvedCount = counts.APPROVED ?? 0;
  const rejectedCount = counts.REJECTED ?? 0;
  const totalCount = counts.ALL ?? (data?.total ?? 0);

  const tabs: { label: string; value: ListingReviewStatus | ''; count: number }[] = [
    { label: 'Pending Review', value: 'PENDING_REVIEW', count: pendingCount },
    { label: 'Approved & Live', value: 'APPROVED', count: approvedCount },
    { label: 'Needs Fix / Rejected', value: 'REJECTED', count: rejectedCount },
    { label: 'Unpublished', value: 'UNPUBLISHED', count: counts.UNPUBLISHED ?? 0 },
    { label: 'Draft', value: 'DRAFT', count: counts.DRAFT ?? 0 },
    { label: 'All Listings', value: '', count: totalCount },
  ];

  return (
    <>
      <PlatformPageHeader
        title="Listing Moderation Console"
        subtitle="Review, approve, or reject partner drone hardware and service listings before they go live on the public marketplace."
      />
      <AdminSubnav />

      {/* KPI Metric Cards */}
      <div className="mod-kpi-grid">
        <div
          className={`mod-kpi-card ${status === 'PENDING_REVIEW' ? 'mod-kpi-card--active' : ''}`}
          onClick={() => setStatus('PENDING_REVIEW')}
          role="button"
          tabIndex={0}
        >
          <div className="mod-kpi-icon-wrap mod-kpi-icon-wrap--pending">⏳</div>
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{pendingCount}</div>
            <div className="mod-kpi-label">Pending Review</div>
          </div>
        </div>

        <div
          className={`mod-kpi-card ${status === 'APPROVED' ? 'mod-kpi-card--active' : ''}`}
          onClick={() => setStatus('APPROVED')}
          role="button"
          tabIndex={0}
        >
          <div className="mod-kpi-icon-wrap mod-kpi-icon-wrap--approved">✓</div>
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{approvedCount}</div>
            <div className="mod-kpi-label">Live on Marketplace</div>
          </div>
        </div>

        <div
          className={`mod-kpi-card ${status === 'REJECTED' ? 'mod-kpi-card--active' : ''}`}
          onClick={() => setStatus('REJECTED')}
          role="button"
          tabIndex={0}
        >
          <div className="mod-kpi-icon-wrap mod-kpi-icon-wrap--rejected">✕</div>
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{rejectedCount}</div>
            <div className="mod-kpi-label">Rejected / Changes Needed</div>
          </div>
        </div>

        <div
          className={`mod-kpi-card ${status === '' ? 'mod-kpi-card--active' : ''}`}
          onClick={() => setStatus('')}
          role="button"
          tabIndex={0}
        >
          <div className="mod-kpi-icon-wrap mod-kpi-icon-wrap--total">📦</div>
          <div className="mod-kpi-data">
            <div className="mod-kpi-num">{totalCount}</div>
            <div className="mod-kpi-label">Total Catalog Items</div>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="mod-tabs-bar">
        <div className="mod-tabs-group">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`mod-tab-btn ${status === tab.value ? 'mod-tab-btn--active' : ''}`}
              onClick={() => setStatus(tab.value)}
            >
              <span>{tab.label}</span>
              <span className="mod-tab-counter">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search and Category Filter Toolbar */}
      <div className="mod-controls-row">
        <div className="mod-search-box">
          <span className="mod-search-icon">🔍</span>
          <input
            type="text"
            className="mod-search-input"
            placeholder="Search by product name, brand, SKU, or partner company…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          id="filter-category"
          className="mod-filter-select"
          value={category}
          onChange={(e) => setCategory((e.target.value || '') as CatalogCategory | '')}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {(searchQuery || category || status !== 'PENDING_REVIEW') && (
          <button
            type="button"
            className="platform-btn platform-btn--secondary"
            onClick={() => {
              setSearchQuery('');
              setCategory('');
              setStatus('PENDING_REVIEW');
            }}
            style={{ fontSize: '0.825rem', height: 40, whiteSpace: 'nowrap' }}
          >
            Reset filters
          </button>
        )}
      </div>

      {error && <div className="platform-card platform-error">{error}</div>}

      {/* Moderation Listing Table */}
      <div className="platform-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <p className="platform-muted">Loading moderation queue…</p>
          </div>
        ) : (
          <>
            <div className="platform-table-wrap">
              <table className="platform-table mod-table">
                <thead>
                  <tr>
                    <th>Listing Item</th>
                    <th>Partner / Seller</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Review Status</th>
                    <th>Submitted</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="mod-listing-cell">
                          {item.primaryImageUrl ? (
                            <img
                              src={item.primaryImageUrl}
                              alt={item.name}
                              className="mod-listing-thumb"
                            />
                          ) : (
                            <div className="mod-listing-thumb-placeholder">✦</div>
                          )}
                          <div className="mod-listing-meta">
                            <div className="mod-listing-title">{item.name}</div>
                            <div className="mod-listing-sub">
                              {item.brand && <span>{item.brand}</span>}
                              {item.sku && <span className="mod-sku-badge">{item.sku}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--platform-text, #14150f)' }}>
                          {item.organization.companyName}
                        </div>
                        <div className="platform-muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                          {[item.organization.city, item.organization.state]
                            .filter(Boolean)
                            .join(', ') || item.organization.country}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#334155',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </td>
                      <td>
                        {item.priceOnRequest ? (
                          <span className="mod-price-por">Price on request</span>
                        ) : (
                          <span className="mod-price-tag">
                            {formatPrice(item.priceOnRequest, item.priceInr)}
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={item.reviewStatus} />
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {item.submittedForReviewAt
                          ? new Date(item.submittedForReviewAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : item.updatedAt
                            ? new Date(item.updatedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={`/admin/listings/${item.id}`}
                          className="mod-review-btn"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredItems.length === 0 && !error && (
              <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>No listings found</h3>
                <p className="platform-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                  {searchQuery
                    ? `No listings matched "${searchQuery}". Try a different keyword.`
                    : 'There are currently no listings under this status or category.'}
                </p>
                {(searchQuery || category) && (
                  <button
                    type="button"
                    className="platform-btn platform-btn--secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setCategory('');
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
