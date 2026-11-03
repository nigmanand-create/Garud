'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { browseMarketplaceListings } from '@/lib/api/marketplace';
import type { CatalogCategory, ListingType } from '@/lib/api/types';
import {
  MARKETPLACE_SECTIONS,
  type MarketplaceSection,
  type MarketplaceSectionId,
  sectionById,
} from '@/lib/platform/marketplace-sections';
import { ApiError } from '@/lib/api/types';
import { EmptyState } from '@/components/platform/EmptyState';
import {
  ListingCard,
  ListingCardSkeleton,
  type ListingCardData,
} from '@/components/platform/ListingCard';
import { MarketingLandingHero } from '@/components/marketing/MarketingLandingHero';
import { SectionTabs } from '@/components/platform/SectionTabs';

const MARKETPLACE_HERO_IMAGE =
  'https://i.ibb.co/B5tNxyyB/Chat-GPT-Image-Aug-26-2026-02-37-37-PM-1.webp';

/** Minimum time the results block stays in “updating” state when switching tabs. */
const TAB_SWITCH_MIN_MS = 480;

const PAGE_SIZE = 24;

type ListingRow = ListingCardData;

function parseSectionFromSearch(
  search: URLSearchParams,
): MarketplaceSectionId | 'all' {
  const section = search.get('section');
  if (section && sectionById(section)) return section as MarketplaceSectionId;

  const listingType = (search.get('listingType') || search.get('type') || '') as
    | ListingType
    | '';
  const category = (search.get('category') || '') as CatalogCategory | '';

  if (listingType === 'PRODUCT' && category === 'ACCESSORY') return 'accessories';
  if (listingType === 'PRODUCT' && category === 'COMPONENT') return 'components';
  if (listingType === 'SERVICE' && category === 'TRAINING') return 'courses';
  if (
    listingType === 'PRODUCT' &&
    [
      'AGRICULTURE_DRONE',
      'SURVEY_MAPPING_DRONE',
      'INDUSTRIAL_ENTERPRISE_DRONE',
      'CAMERA_DRONE',
    ].includes(category)
  ) {
    return 'drones';
  }
  if (listingType === 'SERVICE' && category) return 'services';

  return 'all';
}

function parsePageFromSearch(search: URLSearchParams): number {
  const raw = parseInt(search.get('page') ?? '1', 10);
  return Number.isFinite(raw) && raw >= 1 ? raw : 1;
}

function buildPageNumbers(
  current: number,
  totalPages: number,
): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(totalPages - 1, current + 1);
    p += 1
  ) {
    pages.push(p);
  }
  if (current < totalPages - 2) pages.push('ellipsis');
  if (totalPages > 1) pages.push(totalPages);
  return pages;
}

async function fetchMarketplacePage(
  section: MarketplaceSection | null,
  q: string,
  page: number,
): Promise<{ items: ListingRow[]; total: number }> {
  const skip = (page - 1) * PAGE_SIZE;
  const params: Parameters<typeof browseMarketplaceListings>[0] = {
    q: q || undefined,
    skip,
    take: PAGE_SIZE,
  };

  if (section) {
    if (section.listingType) params.listingType = section.listingType;
    if (section.categories?.length === 1) {
      params.category = section.categories[0];
    } else if (section.categories?.length) {
      params.categories = section.categories;
    }
  }

  const res = await browseMarketplaceListings(params);
  return { items: res.items, total: res.total };
}

const TAB_ITEMS = [
  { id: 'all' as const, label: 'All' },
  ...MARKETPLACE_SECTIONS.map((s) => ({ id: s.id, label: s.shortLabel ?? s.title })),
];

type MarketplacePaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
};

function MarketplacePagination({
  page,
  totalPages,
  total,
  onPage,
}: MarketplacePaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <nav
      className="platform-marketplace-pagination"
      aria-label="Marketplace results pages"
    >
      <p className="platform-marketplace-pagination-summary platform-muted">
        Page {page} of {totalPages} · {total} listing{total === 1 ? '' : 's'}
      </p>
      <div className="platform-marketplace-pagination-controls">
        <button
          type="button"
          className="platform-btn platform-btn-secondary platform-btn-sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <div className="platform-marketplace-pagination-pages">
          {pageNumbers.map((entry, index) =>
            entry === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="platform-marketplace-pagination-ellipsis"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                className={`platform-marketplace-pagination-page${
                  entry === page ? ' platform-marketplace-pagination-page--active' : ''
                }`}
                aria-current={entry === page ? 'page' : undefined}
                onClick={() => onPage(entry)}
              >
                {entry}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          className="platform-btn platform-btn-secondary platform-btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

export function MarketplaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = useMemo(
    () => parseSectionFromSearch(searchParams),
    [searchParams],
  );
  const searchQuery = searchParams.get('q') ?? '';
  const currentPage = useMemo(
    () => parsePageFromSearch(searchParams),
    [searchParams],
  );
  const [searchDraft, setSearchDraft] = useState(searchQuery);

  useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchGeneration, setFetchGeneration] = useState(0);

  const activeSectionConfig = useMemo(() => {
    if (activeSection === 'all') return null;
    return sectionById(activeSection);
  }, [activeSection]);

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  const showEmptyState = !initialLoading && !error && listings.length === 0;
  const showPartnerNudge = !error && !fetching && listings.length > 0;

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    setError(null);
    const started = Date.now();

    const endFetch = () => {
      const wait = Math.max(0, TAB_SWITCH_MIN_MS - (Date.now() - started));
      window.setTimeout(() => {
        if (!cancelled) {
          setFetching(false);
          setInitialLoading(false);
        }
      }, wait);
    };

    const run = async () => {
      try {
        const { items, total } = await fetchMarketplacePage(
          activeSectionConfig ?? null,
          searchQuery,
          currentPage,
        );
        if (cancelled) return;
        setListings(items);
        setTotalResults(total);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Failed to load listings');
      } finally {
        if (!cancelled) endFetch();
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    activeSectionConfig,
    currentPage,
    fetchGeneration,
    searchQuery,
  ]);

  const replaceSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const q = params.toString();
      router.replace(q ? `/marketplace?${q}` : '/marketplace', { scroll: false });
    },
    [router, searchParams],
  );

  const setSection = useCallback(
    (id: MarketplaceSectionId | 'all') => {
      replaceSearchParams((params) => {
        params.delete('type');
        params.delete('listingType');
        params.delete('category');
        params.delete('categories');
        params.delete('page');
        if (id === 'all') params.delete('section');
        else params.set('section', id);
      });
    },
    [replaceSearchParams],
  );

  const goToPage = useCallback(
    (page: number) => {
      const next = Math.min(Math.max(1, page), totalPages);
      replaceSearchParams((params) => {
        if (next <= 1) params.delete('page');
        else params.set('page', String(next));
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [replaceSearchParams, totalPages],
  );

  const retry = useCallback(() => {
    setFetchGeneration((n) => n + 1);
  }, []);

  const applySearch = useCallback(
    (raw: string) => {
      replaceSearchParams((params) => {
        const trimmed = raw.trim();
        if (trimmed) params.set('q', trimmed);
        else params.delete('q');
        params.delete('page');
      });
    },
    [replaceSearchParams],
  );

  const skeletonCount = activeSection === 'all' ? 8 : 6;

  return (
    <div className="platform-marketplace-page">
      <MarketingLandingHero
        imageSrc={MARKETPLACE_HERO_IMAGE}
        imageAlt="Drone marketplace"
        eyebrow="Garud Marketplace"
        title="India's B2B hub for drones, parts & services"
        description="Source from verified OEMs, distributors, and service partners — DGCA-ready training, agri UAVs, survey rigs, and field support, pan-India."
        primaryCta={{ href: '/auth/register?type=partner', label: 'List as B2B Partner' }}
        secondaryCta={{ href: '/buyer/rfqs/new', label: 'Post Drone Requirement (RFQ) →' }}
        trustChips={[
          { iconClass: 'ph ph-fill ph-shield-check', label: 'Verified sellers' },
          { iconClass: 'ph ph-fill ph-check-circle', label: 'Warranty backed' },
          { iconClass: 'ph ph-fill ph-map-pin', label: 'Pan-India delivery' },
        ]}
        statItems={[
          {
            iconClass: 'ph ph-fill ph-storefront',
            bold: '500+',
            label: 'Verified sellers',
          },
          {
            iconClass: 'ph ph-fill ph-scales',
            bold: 'Compare',
            label: 'Specs side by side',
          },
          {
            iconClass: 'ph ph-fill ph-shield-check',
            bold: 'Warranty',
            label: 'Backed purchases',
          },
          {
            iconClass: 'ph ph-fill ph-map-pin',
            bold: 'Pan-India',
            label: 'Delivery & pickup',
          },
        ]}
      />

      <div className="platform-marketplace-body">
      <form
        className="platform-marketplace-search mod-search-box"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          applySearch(searchDraft);
        }}
      >
        <span className="mod-search-icon" aria-hidden>
          🔍
        </span>
        <input
          type="search"
          className="mod-search-input"
          placeholder="Search drones, parts, training, services…"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          aria-label="Search marketplace listings"
        />
        {searchDraft && (
          <button
            type="button"
            className="platform-btn platform-btn-secondary platform-marketplace-search-clear"
            onClick={() => {
              setSearchDraft('');
              applySearch('');
            }}
          >
            Clear
          </button>
        )}
      </form>

      <div className="platform-marketplace-browse">
        <p className="platform-marketplace-browse-label" id="marketplace-categories">
          Browse by category
        </p>
        <SectionTabs
          items={TAB_ITEMS}
          activeId={activeSection}
          onSelect={setSection}
          ariaLabel="Marketplace categories"
          labelledBy="marketplace-categories"
        />
      </div>

      {error && (
        <div className="platform-marketplace-error" role="alert">
          <h2 className="platform-marketplace-error-title">Couldn&apos;t load the marketplace</h2>
          <p className="platform-marketplace-error-desc">
            {error}. Check your connection or try again in a moment — your filters are saved.
          </p>
          <button type="button" className="platform-btn platform-btn-cta" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      {initialLoading && fetching && !error && (
        <div className="platform-grid" aria-busy="true" aria-label="Loading listings">
          {Array.from({ length: skeletonCount }, (_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!initialLoading && !error && (
        <div
          className={`platform-marketplace-results${fetching ? ' platform-marketplace-results--fetching' : ''}`}
          aria-busy={fetching}
        >
          {listings.length > 0 && (
            <>
              {(activeSection === 'all' || searchQuery) && (
                <p className="platform-marketplace-results-hint platform-muted">
                  {searchQuery
                    ? `Results for “${searchQuery}”.`
                    : 'Showing listings across categories. Pick a tab above to narrow your search.'}
                </p>
              )}
              <div className="platform-grid">
                {listings.map((item) => (
                  <ListingCard key={item.id} item={item} />
                ))}
              </div>
              <MarketplacePagination
                page={currentPage}
                totalPages={totalPages}
                total={totalResults}
                onPage={goToPage}
              />
            </>
          )}

          {showEmptyState && (
            <EmptyState
              title="Listings coming soon"
              description="We're onboarding verified partners across drones, spares, training, and services. Be among the first to list — buyers are already exploring Garud."
              primaryAction={{
                label: 'Join as partner',
                href: '/auth/register?type=partner',
              }}
              secondaryAction={{
                label: 'Talk to our team',
                href: '/enquiry',
              }}
              icon="📦"
            />
          )}

          {showPartnerNudge && (
            <p className="platform-marketplace-partner-nudge platform-muted">
              Selling drones or services in India?{' '}
              <Link href="/auth/register?type=partner" className="platform-auth-link-accent">
                Join as a verified partner
              </Link>
            </p>
          )}
        </div>
      )}

      {showEmptyState && (
        <div className="platform-marketplace-sticky-cta" aria-hidden={false}>
          <Link href="/auth/register?type=partner" className="platform-btn platform-btn-cta platform-btn-full">
            Join as partner
          </Link>
        </div>
      )}
      </div>
    </div>
  );
}
