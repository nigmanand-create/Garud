'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { fetchMarketplaceFacets } from '@/lib/api/marketplace';
import type { AccountType, CatalogCategory } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import {
  ACCOUNT_TYPE_LABELS,
  CATEGORY_LABELS,
  PARTNER_ACCOUNT_TYPES,
} from '@/lib/platform/labels';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';

type VendorRow = {
  id: string;
  companyName: string;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  website?: string | null;
  industries: string[];
  owner?: { accountType: AccountType } | null;
  _count: { listings: number };
};

type VendorsResponse = {
  items: VendorRow[];
  total: number;
  skip: number;
  take: number;
};

const PAGE_SIZE = 24;

const VENDOR_CATEGORIES: CatalogCategory[] = [
  'AGRICULTURE_DRONE',
  'SURVEY_MAPPING_DRONE',
  'INDUSTRIAL_ENTERPRISE_DRONE',
  'CAMERA_DRONE',
  'COMPONENT',
  'PAYLOAD',
  'ACCESSORY',
  'TRAINING',
  'REPAIR_MAINTENANCE',
  'CONSULTANCY',
];

export default function MarketplaceVendorsPage() {
  const [data, setData] = useState<VendorsResponse | null>(null);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [skip, setSkip] = useState(0);
  const [stateFilter, setStateFilter] = useState('');
  const [accountType, setAccountType] = useState<AccountType | ''>('');
  const [category, setCategory] = useState<CatalogCategory | ''>('');
  const [states, setStates] = useState<string[]>([]);
  const hasFilters = Boolean(q.trim() || stateFilter || accountType || category);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('skip', String(skip));
      params.set('take', String(PAGE_SIZE));
      if (q.trim()) params.set('q', q.trim());
      if (stateFilter) params.set('state', stateFilter);
      if (accountType) params.set('accountType', accountType);
      if (category) params.set('category', category);
      const res = await apiRequest<VendorsResponse>(
        `/marketplace/vendors?${params.toString()}`,
      );
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load vendors');
    } finally {
      setLoading(false);
    }
  }, [q, skip, stateFilter, accountType, category]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchMarketplaceFacets()
      .then((f) => setStates(f.states))
      .catch(() => setStates([]));
  }, []);

  function resetFilters() {
    setSkip(0);
    setQ('');
    setSearchInput('');
    setStateFilter('');
    setAccountType('');
    setCategory('');
  }

  const total = data?.total ?? 0;
  const page = Math.floor(skip / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PlatformPageHeader
        breadcrumbs={[
          { label: 'Marketplace', href: '/marketplace' },
          { label: 'Verified vendors' },
        ]}
        title="Verified vendor directory"
        subtitle="Browse DGCA-verified partners on GarudHub with published listing counts."
      />

      <form
        className="platform-card platform-mb-lg"
        onSubmit={(e) => {
          e.preventDefault();
          setSkip(0);
          setQ(searchInput);
        }}
      >
        <label htmlFor="vendor-search" className="platform-muted platform-text-muted-sm">
          Search by company or location
        </label>
        <div className="platform-action-stack platform-mt-sm" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '0.75rem' }}>
          <input
            id="vendor-search"
            type="search"
            className="platform-input"
            style={{ flex: '1 1 220px', minWidth: 0 }}
            placeholder="Company name, city, state…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="platform-btn platform-btn-cta">
            Search
          </button>
        </div>
        <div className="platform-marketplace-filters platform-mt-md" role="group" aria-label="Filter vendors">
          <label className="platform-marketplace-filter">
            <span>Location</span>
            <select
              value={stateFilter}
              onChange={(e) => {
                setSkip(0);
                setStateFilter(e.target.value);
              }}
            >
              <option value="">All India</option>
              {states.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
          <label className="platform-marketplace-filter">
            <span>Partner type</span>
            <select
              value={accountType}
              onChange={(e) => {
                setSkip(0);
                setAccountType(e.target.value as AccountType | '');
              }}
            >
              <option value="">All types</option>
              {PARTNER_ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="platform-marketplace-filter">
            <span>Sells / offers</span>
            <select
              value={category}
              onChange={(e) => {
                setSkip(0);
                setCategory(e.target.value as CatalogCategory | '');
              }}
            >
              <option value="">Any category</option>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          {hasFilters && (
            <button
              type="button"
              className="platform-btn platform-btn-secondary platform-btn-sm"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          )}
        </div>
      </form>

      {error && <div className="platform-card platform-error platform-mb-lg">{error}</div>}

      {loading && !data ? (
        <p className="platform-muted" aria-busy="true">
          Loading vendors…
        </p>
      ) : (
        <>
          <p className="platform-muted platform-mb-md">
            {total} verified partner{total === 1 ? '' : 's'}
            {q.trim() ? ` matching “${q.trim()}”` : ''}
            {stateFilter ? ` in ${stateFilter}` : ''}
          </p>

          {(data?.items ?? []).length === 0 && !loading && (
            <div className="platform-card platform-empty-state-card">
              <p className="platform-empty-state-card__title">No vendors match these filters</p>
              <p className="platform-empty-state-card__desc">
                Try a wider location or category — or post an RFQ and let verified vendors come to you.
              </p>
              <div className="platform-actions platform-mt-md">
                {hasFilters && (
                  <button type="button" className="platform-btn platform-btn-secondary" onClick={resetFilters}>
                    Reset filters
                  </button>
                )}
                <Link href="/buyer/rfqs/new" className="platform-btn platform-btn-cta">
                  Post a requirement (RFQ)
                </Link>
              </div>
            </div>
          )}

          <div className="platform-grid">
            {(data?.items ?? []).map((vendor) => {
              const location = [vendor.city, vendor.state, vendor.country]
                .filter(Boolean)
                .join(', ');
              return (
                <Link
                  key={vendor.id}
                  href={`/marketplace/partners/${vendor.id}`}
                  className="platform-listing-card platform-listing-card-link"
                >
                  <div className="platform-listing-card-body">
                  <div className="platform-listing-card-badges">
                    <span className="platform-badge platform-badge--verified">
                      <span aria-hidden>✓</span> Verified (KYC)
                    </span>
                    {vendor.owner?.accountType && (
                      <span className="platform-badge platform-badge--muted">
                        {ACCOUNT_TYPE_LABELS[vendor.owner.accountType]}
                      </span>
                    )}
                  </div>
                  <h3 className="platform-listing-card-title">{vendor.companyName}</h3>
                  {location && (
                    <p className="platform-muted platform-text-muted-sm">{location}</p>
                  )}
                  <p className="platform-mt-sm">
                    <strong>{vendor._count.listings}</strong> published listing
                    {vendor._count.listings === 1 ? '' : 's'}
                  </p>
                  {vendor.industries?.length > 0 && (
                    <p className="platform-muted platform-text-muted-sm platform-mt-sm">
                      {vendor.industries.slice(0, 3).join(' · ')}
                    </p>
                  )}
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="platform-pagination platform-mt-lg">
              <button
                type="button"
                className="platform-btn platform-btn-secondary"
                disabled={skip <= 0 || loading}
                onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
              >
                Previous
              </button>
              <span className="platform-muted">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="platform-btn platform-btn-secondary"
                disabled={skip + PAGE_SIZE >= total || loading}
                onClick={() => setSkip(skip + PAGE_SIZE)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
