'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/platform/EmptyState';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { useCompare } from '@/components/platform/useCompare';
import { fetchCompareListings, type CompareListingDetail } from '@/lib/api/marketplace';
import { ApiError } from '@/lib/api/types';
import {
  buildCompareRows,
  COMPARE_MAX,
  compareHref,
  parseCompareIdsParam,
  writeCompareIds,
} from '@/lib/platform/compare';
import { CATEGORY_LABELS, formatPrice } from '@/lib/platform/labels';
import { resolveListingImageUrl } from '@/lib/platform/listing-media';

function CompareInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlIds = useMemo(
    () => parseCompareIdsParam(searchParams.get('ids')),
    [searchParams],
  );
  const { ids: storedIds } = useCompare();

  // Deep links win; otherwise fall back to the session selection.
  const ids = urlIds.length > 0 ? urlIds : storedIds;
  const key = ids.join(',');

  const [items, setItems] = useState<CompareListingDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlyDifferences, setOnlyDifferences] = useState(false);

  // Opening a shared link seeds the local selection so the tray/toggles stay in sync.
  useEffect(() => {
    if (urlIds.length > 0) writeCompareIds(urlIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlIds.join(',')]);

  useEffect(() => {
    if (!key) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCompareListings(key.split(','))
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Could not load products');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Keep the URL in step when items are removed or unpublished.
  const visibleIds = items.map((i) => i.id);
  const rows = useMemo(
    () =>
      buildCompareRows(items, {
        categoryLabel: (c) => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c,
        priceLabel: formatPrice,
      }),
    [items],
  );
  const shownRows = onlyDifferences ? rows.filter((r) => r.differs) : rows;

  function removeItem(id: string) {
    const next = visibleIds.filter((x) => x !== id);
    writeCompareIds(next);
    router.replace(next.length ? compareHref(next) : '/marketplace/compare', { scroll: false });
  }

  return (
    <>
      <PlatformPageHeader
        breadcrumbs={[{ label: 'Marketplace', href: '/marketplace' }, { label: 'Compare products' }]}
        title="Compare products"
        subtitle={`Side-by-side specs for up to ${COMPARE_MAX} listings. Need exact quotes? Post an RFQ and compare vendor bids.`}
      />

      {error && <div className="platform-card platform-error">{error}</div>}

      {!key && (
        <EmptyState
          title="Nothing to compare yet"
          description="Tick “Compare” on two or more marketplace listings, then come back here."
          primaryAction={{ label: 'Browse marketplace', href: '/marketplace' }}
          secondaryAction={{ label: 'Post an RFQ', href: '/buyer/rfqs/new' }}
          icon="⚖"
        />
      )}

      {key && loading && items.length === 0 && (
        <p className="platform-muted" aria-busy="true">
          Loading products…
        </p>
      )}

      {key && !loading && !error && items.length < 2 && (
        <EmptyState
          title={items.length === 0 ? 'Those listings are no longer available' : 'Add one more product'}
          description="Comparison needs at least two live listings."
          primaryAction={{ label: 'Back to marketplace', href: '/marketplace' }}
          icon="⚖"
        />
      )}

      {items.length >= 2 && (
        <>
          <div className="platform-compare-controls">
            <label className="platform-compare-controls__check">
              <input
                type="checkbox"
                checked={onlyDifferences}
                onChange={(e) => setOnlyDifferences(e.target.checked)}
              />{' '}
              Show differences only
            </label>
            <Link href="/marketplace" className="platform-btn platform-btn-secondary platform-btn-sm">
              + Add more products
            </Link>
          </div>

          <div className="platform-card platform-card--flush">
            <div className="platform-table-wrap">
              <table className="platform-table platform-compare-table">
                <thead>
                  <tr>
                    <th scope="col" className="platform-compare-table__label">
                      &nbsp;
                    </th>
                    {items.map((item) => {
                      const img = resolveListingImageUrl(item.primaryImageUrl);
                      return (
                        <th key={item.id} scope="col" className="platform-compare-table__product">
                          {img && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="platform-compare-table__img" />
                          )}
                          <Link href={`/marketplace/listings/${item.id}`}>{item.name}</Link>
                          <div className="platform-compare-table__actions">
                            <button
                              type="button"
                              className="platform-btn platform-btn-secondary platform-btn-sm"
                              onClick={() => removeItem(item.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {shownRows.map((row) => (
                    <tr key={row.key} className={row.differs ? 'platform-compare-row--diff' : ''}>
                      <th scope="row" className="platform-compare-table__label">
                        {row.label}
                      </th>
                      {row.values.map((value, i) => (
                        <td key={items[i].id} className="platform-pre-wrap">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="platform-compare-table__label">
                      Next step
                    </th>
                    {items.map((item) => (
                      <td key={item.id}>
                        <div className="platform-action-stack">
                          <Link
                            href={`/buyer/rfqs/new?listing=${item.id}`}
                            className="platform-btn platform-btn-cta platform-btn-sm"
                          >
                            Request quote
                          </Link>
                          <Link
                            href={`/marketplace/listings/${item.id}`}
                            className="platform-btn platform-btn-secondary platform-btn-sm"
                          >
                            View details
                          </Link>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function MarketplaceComparePage() {
  return (
    <Suspense fallback={<p className="platform-muted">Loading comparison…</p>}>
      <CompareInner />
    </Suspense>
  );
}
