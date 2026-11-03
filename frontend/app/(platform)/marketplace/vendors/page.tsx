'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/types';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';

type VendorRow = {
  id: string;
  companyName: string;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  website?: string | null;
  industries: string[];
  _count: { listings: number };
};

type VendorsResponse = {
  items: VendorRow[];
  total: number;
  skip: number;
  take: number;
};

const PAGE_SIZE = 24;

export default function MarketplaceVendorsPage() {
  const [data, setData] = useState<VendorsResponse | null>(null);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [skip, setSkip] = useState(0);
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
      const res = await apiRequest<VendorsResponse>(
        `/marketplace/vendors?${params.toString()}`,
      );
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load vendors');
    } finally {
      setLoading(false);
    }
  }, [q, skip]);

  useEffect(() => {
    load();
  }, [load]);

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
          </p>

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
