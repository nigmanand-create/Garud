'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  browseMarketplaceListings,
  fetchFeaturedMarketplaceListings,
  fetchMarketplaceFacets,
  type MarketplaceFacets,
} from '@/lib/api/marketplace';
import type { CatalogCategory, ListingType } from '@/lib/api/types';
import {
  MARKETPLACE_SECTIONS,
  type MarketplaceSection,
  type MarketplaceSectionId,
  sectionById,
} from '@/lib/platform/marketplace-sections';
import { ApiError } from '@/lib/api/types';
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
} from '@/lib/platform/labels';
import { EmptyState } from '@/components/platform/EmptyState';
import {
  ListingCard,
  ListingCardSkeleton,
  type ListingCardData,
} from '@/components/platform/ListingCard';
import { MarketingLandingHero } from '@/components/marketing/MarketingLandingHero';
import { SectionTabs } from '@/components/platform/SectionTabs';
import {
  BusinessOpportunitiesBlock,
  MarketplaceRfqBlock,
} from '@/components/platform/BusinessOpportunities';
import { CompareTray } from '@/components/platform/CompareTray';

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

type SortValue = 'newest' | 'price_asc' | 'price_desc';
type PriceValue = '' | 'priced' | 'rfq';

type ListingFilters = {
  state: string;
  listingState: string;
  brand: string;
  city: string;
  price: PriceValue;
  sort: SortValue;
  minPrice: string;
  maxPrice: string;
  maxMoq: string;
  listingType: '' | ListingType;
  category: '' | CatalogCategory;
};

const SERVICE_CATALOG_CATEGORIES: CatalogCategory[] = [
  'TRAINING',
  'REPAIR_MAINTENANCE',
  'CONSULTANCY',
  'OTHER',
];

function listingTypeForCategory(cat: CatalogCategory): ListingType {
  return SERVICE_CATALOG_CATEGORIES.includes(cat) ? 'SERVICE' : 'PRODUCT';
}

function isCatalogCategory(value: string): value is CatalogCategory {
  return Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, value);
}

function parseFiltersFromSearch(search: URLSearchParams): ListingFilters {
  const price = search.get('price');
  const sort = search.get('sort');
  const lt = search.get('listingType') as ListingType | null;
  const cat = search.get('category') as CatalogCategory | null;
  return {
    state: search.get('state')?.trim() ?? '',
    listingState: search.get('listingState')?.trim() ?? '',
    brand: search.get('brand')?.trim() ?? '',
    city: search.get('city')?.trim() ?? '',
    price: price === 'priced' || price === 'rfq' ? price : '',
    sort: sort === 'price_asc' || sort === 'price_desc' ? sort : 'newest',
    minPrice: search.get('minPrice')?.trim() ?? '',
    maxPrice: search.get('maxPrice')?.trim() ?? '',
    maxMoq: search.get('maxMoq')?.trim() ?? '',
    listingType: lt === 'PRODUCT' || lt === 'SERVICE' ? lt : '',
    category: cat && isCatalogCategory(cat) ? cat : '',
  };
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
  filters: ListingFilters,
): Promise<{ items: ListingRow[]; total: number }> {
  const skip = (page - 1) * PAGE_SIZE;
  const params: Parameters<typeof browseMarketplaceListings>[0] = {
    q: q || undefined,
    state: filters.state || undefined,
    listingState: filters.listingState || undefined,
    brand: filters.brand || undefined,
    city: filters.city || undefined,
    priceType: filters.price || undefined,
    sort: filters.sort,
    skip,
    take: PAGE_SIZE,
  };

  if (filters.price !== 'rfq') {
    const minN = filters.minPrice ? parseFloat(filters.minPrice) : NaN;
    if (Number.isFinite(minN)) params.minPrice = minN;
    const maxN = filters.maxPrice ? parseFloat(filters.maxPrice) : NaN;
    if (Number.isFinite(maxN)) params.maxPrice = maxN;
  }
  const moqN = filters.maxMoq ? parseInt(filters.maxMoq, 10) : NaN;
  if (Number.isFinite(moqN)) params.maxMoq = moqN;

  if (section) {
    if (section.listingType) params.listingType = section.listingType;
    if (section.categories?.length === 1) {
      params.category = section.categories[0];
    } else if (section.categories?.length) {
      params.categories = section.categories;
    }
  } else if (filters.category) {
    params.category = filters.category;
    params.listingType =
      filters.listingType || listingTypeForCategory(filters.category);
  } else if (filters.listingType) {
    params.listingType = filters.listingType;
  }

  const res = await browseMarketplaceListings(params);
  return { items: res.items, total: res.total };
}

const TAB_ITEMS = [
  { id: 'all' as const, label: 'All' },
  ...MARKETPLACE_SECTIONS.map((s) => ({ id: s.id, label: s.shortLabel ?? s.title })),
];

const FILTER_PARAM_KEYS = [
  'q',
  'state',
  'listingState',
  'brand',
  'city',
  'price',
  'sort',
  'page',
  'section',
  'type',
  'listingType',
  'category',
  'categories',
  'minPrice',
  'maxPrice',
  'maxMoq',
] as const;

type MarketplacePaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  /** Only “Showing X–Y of Z” (and page N of M when multi-page). */
  summaryOnly?: boolean;
  /** Only Prev / page numbers / Next. */
  controlsOnly?: boolean;
};

type ActiveFilterChip = { key: string; label: string };

function buildActiveFilterChips(
  filters: ListingFilters,
  searchQuery: string,
  activeSection: MarketplaceSectionId | 'all',
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const q = searchQuery.trim();
  if (q) chips.push({ key: 'q', label: `Search: "${q}"` });

  if (activeSection !== 'all') {
    const tab = TAB_ITEMS.find((t) => t.id === activeSection);
    chips.push({
      key: 'section',
      label: `Browse: ${tab?.label ?? activeSection}`,
    });
  }

  if (filters.category) {
    chips.push({
      key: 'category',
      label: `Category: ${CATEGORY_LABELS[filters.category]}`,
    });
  }
  if (filters.listingType) {
    chips.push({
      key: 'listingType',
      label: `Type: ${LISTING_TYPE_LABELS[filters.listingType]}`,
    });
  }
  if (filters.state) chips.push({ key: 'state', label: `Vendor state: ${filters.state}` });
  if (filters.listingState) {
    chips.push({ key: 'listingState', label: `Listing state: ${filters.listingState}` });
  }
  if (filters.brand) chips.push({ key: 'brand', label: `Brand: ${filters.brand}` });
  if (filters.city) chips.push({ key: 'city', label: `City: ${filters.city}` });
  if (filters.price === 'priced') chips.push({ key: 'price', label: 'Pricing: listed price' });
  if (filters.price === 'rfq') chips.push({ key: 'price', label: 'Pricing: on request' });
  if (filters.sort !== 'newest') {
    const sortLabel =
      filters.sort === 'price_asc'
        ? 'Price: low to high'
        : filters.sort === 'price_desc'
          ? 'Price: high to low'
          : filters.sort;
    chips.push({ key: 'sort', label: `Sort: ${sortLabel}` });
  }
  if (filters.minPrice || filters.maxPrice) {
    const lo = filters.minPrice || '…';
    const hi = filters.maxPrice || '…';
    chips.push({ key: 'priceRange', label: `₹ ${lo} – ${hi}` });
  }
  if (filters.maxMoq) {
    chips.push({ key: 'maxMoq', label: `Max MOQ: up to ${filters.maxMoq}` });
  }

  return chips;
}

function countSecondaryFilters(
  filters: ListingFilters,
  searchQuery: string,
  activeSection: MarketplaceSectionId | 'all',
): number {
  let count = 0;
  if (searchQuery.trim()) count += 1;
  if (activeSection !== 'all') count += 1;
  if (filters.state) count += 1;
  if (filters.listingState) count += 1;
  if (filters.brand) count += 1;
  if (filters.city) count += 1;
  if (filters.price) count += 1;
  if (filters.sort !== 'newest') count += 1;
  if (filters.minPrice || filters.maxPrice) count += 1;
  if (filters.maxMoq) count += 1;
  if (filters.listingType) count += 1;
  if (filters.category) count += 1;
  return count;
}

type MarketplaceSearchFieldProps = {
  searchDraft: string;
  setSearchDraft: (value: string) => void;
  applySearch: (raw: string) => void;
  className?: string;
};

function MarketplaceSearchField({
  searchDraft,
  setSearchDraft,
  applySearch,
  className = '',
}: MarketplaceSearchFieldProps) {
  return (
    <form
      className={`platform-marketplace-search mod-search-box${className ? ` ${className}` : ''}`}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        applySearch(searchDraft);
      }}
    >
      <span className="mod-search-icon" aria-hidden>
        <i className="bi bi-search" />
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
  );
}

type MarketplaceFilterFieldsProps = {
  filters: ListingFilters;
  facets: MarketplaceFacets;
  onChange: (next: Partial<ListingFilters>) => void;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
  showVendorsLink?: boolean;
};

function MarketplaceFilterFields({
  filters,
  facets,
  onChange,
  hasActiveFilters,
  clearAllFilters,
  showVendorsLink = true,
}: MarketplaceFilterFieldsProps) {
  const priceBounds = facets.priceInr;
  const minHint = priceBounds
    ? Math.floor(parseFloat(priceBounds.min) || 0)
    : undefined;
  const maxHint = priceBounds
    ? Math.ceil(parseFloat(priceBounds.max) || 0)
    : undefined;
  const moqCap = facets.moqMax;

  const categories = facets.categories ?? [];
  const brands = facets.brands ?? [];
  const cities = facets.cities ?? [];
  const listingStates = facets.listingStates ?? [];
  const vendorStates = facets.states ?? [];

  return (
    <div className="platform-marketplace-filters-inner">
      <div className="platform-marketplace-filter-group">
        <h3 className="platform-marketplace-filter-group__title">Category</h3>
        <label className="platform-marketplace-filter">
          <span>Catalog category</span>
          <select
            value={filters.category}
            onChange={(e) => {
              const v = e.target.value as CatalogCategory | '';
              onChange({
                category: v,
                listingType: v ? listingTypeForCategory(v) : '',
              });
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
            {filters.category &&
              !categories.includes(filters.category) && (
                <option value={filters.category}>
                  {CATEGORY_LABELS[filters.category]}
                </option>
              )}
          </select>
        </label>
        <label className="platform-marketplace-filter">
          <span>Listing type</span>
          <select
            value={filters.listingType}
            onChange={(e) => {
              const v = e.target.value as ListingType | '';
              onChange({ listingType: v });
            }}
          >
            <option value="">Any</option>
            {(facets.listingTypes ?? []).map((lt) => (
              <option key={lt} value={lt}>
                {LISTING_TYPE_LABELS[lt]}
              </option>
            ))}
            {filters.listingType &&
              !(facets.listingTypes ?? []).includes(filters.listingType) && (
                <option value={filters.listingType}>
                  {LISTING_TYPE_LABELS[filters.listingType]}
                </option>
              )}
          </select>
        </label>
      </div>

      <div className="platform-marketplace-filter-group">
        <h3 className="platform-marketplace-filter-group__title">Price &amp; MOQ</h3>
        <label className="platform-marketplace-filter">
          <span>Pricing</span>
          <select
            value={filters.price}
            onChange={(e) => onChange({ price: e.target.value as PriceValue })}
          >
            <option value="">Any pricing</option>
            <option value="priced">Listed price (buy now)</option>
            <option value="rfq">Price on request</option>
          </select>
        </label>
        <div
          className={`platform-marketplace-filter-row${
            filters.price === 'rfq' ? ' platform-marketplace-filter-row--disabled' : ''
          }`}
        >
          <label className="platform-marketplace-filter">
            <span>Min (₹)</span>
            <input
              type="number"
              inputMode="decimal"
              min={minHint}
              max={maxHint}
              placeholder={minHint != null ? String(minHint) : 'Min'}
              value={filters.minPrice}
              disabled={filters.price === 'rfq'}
              onChange={(e) => onChange({ minPrice: e.target.value })}
            />
          </label>
          <label className="platform-marketplace-filter">
            <span>Max (₹)</span>
            <input
              type="number"
              inputMode="decimal"
              min={minHint}
              max={maxHint}
              placeholder={maxHint != null ? String(maxHint) : 'Max'}
              value={filters.maxPrice}
              disabled={filters.price === 'rfq'}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
            />
          </label>
        </div>
        {priceBounds && filters.price !== 'rfq' && (
          <p className="platform-marketplace-filter-hint platform-muted">
            Active range in catalog: ₹{minHint?.toLocaleString('en-IN')} – ₹
            {maxHint?.toLocaleString('en-IN')}
          </p>
        )}
        <label
          className={`platform-marketplace-filter${
            moqCap == null ? ' platform-marketplace-filter--muted' : ''
          }`}
        >
          <span>Max MOQ</span>
          <select
            value={filters.maxMoq}
            onChange={(e) => onChange({ maxMoq: e.target.value })}
            disabled={moqCap == null}
          >
            <option value="">Any MOQ</option>
            {moqCap != null &&
              [1, 5, 10, 25, 50, 100, 250, 500]
                .filter((n) => n <= moqCap)
                .map((n) => (
                  <option key={n} value={String(n)}>
                    Up to {n} unit{n === 1 ? '' : 's'}
                  </option>
                ))}
            {moqCap != null && moqCap > 500 && (
              <option value={String(moqCap)}>
                Up to {moqCap} units (max in catalog)
              </option>
            )}
          </select>
        </label>
      </div>

      <div className="platform-marketplace-filter-group">
        <h3 className="platform-marketplace-filter-group__title">Brand &amp; seller</h3>
        <label className="platform-marketplace-filter">
          <span>Brand</span>
          <select
            value={filters.brand}
            onChange={(e) => onChange({ brand: e.target.value })}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
            {filters.brand && !brands.includes(filters.brand) && (
              <option value={filters.brand}>{filters.brand}</option>
            )}
          </select>
        </label>
      </div>

      <div className="platform-marketplace-filter-group">
        <h3 className="platform-marketplace-filter-group__title">Location</h3>
        <label className="platform-marketplace-filter">
          <span>Vendor state</span>
          <select
            value={filters.state}
            onChange={(e) => onChange({ state: e.target.value })}
          >
            <option value="">All India</option>
            {filters.state && !vendorStates.includes(filters.state) && (
              <option value={filters.state}>{filters.state}</option>
            )}
            {vendorStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </label>
        <label className="platform-marketplace-filter">
          <span>Listing city</span>
          <select
            value={filters.city}
            onChange={(e) => onChange({ city: e.target.value })}
          >
            <option value="">Any city</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {filters.city && !cities.includes(filters.city) && (
              <option value={filters.city}>{filters.city}</option>
            )}
          </select>
        </label>
        <label className="platform-marketplace-filter">
          <span>Listing state</span>
          <select
            value={filters.listingState}
            onChange={(e) => onChange({ listingState: e.target.value })}
          >
            <option value="">Any / not set</option>
            {listingStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
            {filters.listingState &&
              !listingStates.includes(filters.listingState) && (
                <option value={filters.listingState}>
                  {filters.listingState}
                </option>
              )}
          </select>
        </label>
      </div>

      <div className="platform-marketplace-filter-group">
        <h3 className="platform-marketplace-filter-group__title">Sort</h3>
        <label className="platform-marketplace-filter">
          <span>Order</span>
          <select
            value={filters.sort}
            onChange={(e) => onChange({ sort: e.target.value as SortValue })}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          className="platform-btn platform-btn-secondary platform-btn-sm platform-marketplace-filters-reset"
          onClick={clearAllFilters}
        >
          Clear all
        </button>
      )}
      {showVendorsLink && (
        <Link
          href="/marketplace/vendors"
          className="platform-marketplace-filters__vendors"
        >
          Browse verified vendors →
        </Link>
      )}
    </div>
  );
}

function marketplaceResultRange(
  page: number,
  total: number,
  pageSize: number,
  totalPages: number,
): { start: number; end: number; summary: string } {
  if (total <= 0) {
    return { start: 0, end: 0, summary: '' };
  }
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const summary =
    totalPages > 1
      ? `Showing ${start}–${end} of ${total} · Page ${page} of ${totalPages}`
      : `Showing ${start}–${end} of ${total}`;
  return { start, end, summary };
}

function MarketplacePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  summaryOnly = false,
  controlsOnly = false,
}: MarketplacePaginationProps) {
  if (total <= 0) return null;

  const pageNumbers = buildPageNumbers(page, totalPages);
  const { summary } = marketplaceResultRange(page, total, pageSize, totalPages);
  const showPageControls = totalPages > 1;

  if (summaryOnly) {
    return (
      <p className="platform-marketplace-pagination-summary platform-muted">{summary}</p>
    );
  }

  if (controlsOnly && !showPageControls) {
    return null;
  }

  return (
    <nav
      className={`platform-marketplace-pagination${showPageControls && !controlsOnly ? ' platform-marketplace-pagination--has-controls' : ''}${controlsOnly && showPageControls ? ' platform-marketplace-pagination--bottom' : ''}`}
      aria-label="Marketplace results pages"
    >
      {!controlsOnly && (
        <p className="platform-marketplace-pagination-summary platform-muted">{summary}</p>
      )}
      {showPageControls && (
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
      )}
    </nav>
  );
}

type MarketplaceActiveFiltersCompactProps = {
  filterCount: number;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  className?: string;
};

/** Icon + count + Clear — compact alternative to a full-width “active filters” banner. */
function MarketplaceActiveFiltersCompact({
  filterCount,
  onClearAll,
  hasActiveFilters,
  className = '',
}: MarketplaceActiveFiltersCompactProps) {
  if (!hasActiveFilters) return null;

  return (
    <div
      className={`platform-marketplace-active-compact${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={
        filterCount > 0
          ? `${filterCount} active filter${filterCount === 1 ? '' : 's'}`
          : 'Filters applied'
      }
    >
      <span className="platform-marketplace-active-compact__icon" aria-hidden>
        <i className="bi bi-funnel" />
      </span>
      {filterCount > 0 && (
        <span className="platform-marketplace-active-compact__badge">{filterCount}</span>
      )}
      <button
        type="button"
        className="platform-marketplace-active-compact__clear"
        onClick={onClearAll}
        aria-label="Clear all filters"
      >
        Clear
      </button>
    </div>
  );
}

function MarketplaceInlineFilterChips({ chips }: { chips: ActiveFilterChip[] }) {
  if (chips.length === 0) return null;

  return (
    <ul className="platform-marketplace-inline-filters" aria-label="Active filter summary">
      {chips.map((c, i) => (
        <li key={`${c.key}-${i}`}>
          <span className="platform-marketplace-inline-filter-chip">{c.label}</span>
        </li>
      ))}
    </ul>
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
  const filters = useMemo(() => parseFiltersFromSearch(searchParams), [searchParams]);

  const [facets, setFacets] = useState<MarketplaceFacets>({
    states: [],
    categories: [],
    listingTypes: [],
    brands: [],
    cities: [],
    listingStates: [],
    priceInr: null,
    moqMax: null,
  });
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const mobileFiltersSheetId = useId();
  const mobileFiltersTitleId = useId();

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
        params.delete('listingState');
        params.delete('brand');
        params.delete('city');
        params.delete('minPrice');
        params.delete('maxPrice');
        params.delete('maxMoq');
        if (id === 'all') params.delete('section');
        else params.set('section', id);
      });
    },
    [replaceSearchParams],
  );

  const updateFilters = useCallback(
    (partial: Partial<ListingFilters>) => {
      replaceSearchParams((params) => {
        params.delete('page');
        params.delete('section');
        params.delete('categories');
        params.delete('type');

        const setOrDelete = (key: string, value: string | undefined) => {
          const trimmed = value?.trim() ?? '';
          if (!trimmed) params.delete(key);
          else params.set(key, trimmed);
        };

        if (partial.state !== undefined) setOrDelete('state', partial.state);
        if (partial.listingState !== undefined)
          setOrDelete('listingState', partial.listingState);
        if (partial.brand !== undefined) setOrDelete('brand', partial.brand);
        if (partial.city !== undefined) setOrDelete('city', partial.city);
        if (partial.price !== undefined) {
          if (!partial.price) params.delete('price');
          else params.set('price', partial.price);
        }
        if (partial.sort !== undefined) {
          if (!partial.sort || partial.sort === 'newest') params.delete('sort');
          else params.set('sort', partial.sort);
        }
        if (partial.minPrice !== undefined)
          setOrDelete('minPrice', partial.minPrice);
        if (partial.maxPrice !== undefined)
          setOrDelete('maxPrice', partial.maxPrice);
        if (partial.maxMoq !== undefined)
          setOrDelete('maxMoq', partial.maxMoq);
        if (partial.listingType !== undefined) {
          if (!partial.listingType) params.delete('listingType');
          else params.set('listingType', partial.listingType);
        }
        if (partial.category !== undefined) {
          if (!partial.category) params.delete('category');
          else {
            params.set('category', partial.category);
            params.delete('section');
            params.delete('categories');
          }
        }

        if (partial.price === 'rfq') {
          params.delete('minPrice');
          params.delete('maxPrice');
        }
      });
    },
    [replaceSearchParams],
  );

  const clearAllFilters = useCallback(() => {
    setSearchDraft('');
    replaceSearchParams((params) => {
      FILTER_PARAM_KEYS.forEach((k) => params.delete(k));
    });
  }, [replaceSearchParams]);

  const secondaryFilterCount = useMemo(
    () => countSecondaryFilters(filters, searchQuery, activeSection),
    [filters, searchQuery, activeSection],
  );

  useEffect(() => {
    fetchMarketplaceFacets()
      .then((f) => setFacets(f))
      .catch(() =>
        setFacets({
          states: [],
          categories: [],
          listingTypes: [],
          brands: [],
          cities: [],
          listingStates: [],
          priceInr: null,
          moqMax: null,
        }),
      );
  }, []);

  useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileFiltersOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileFiltersOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const onChange = () => {
      if (mq.matches) setMobileFiltersOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [featuredListings, setFeaturedListings] = useState<ListingRow[]>([]);
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

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      activeSection !== 'all' ||
      filters.state ||
      filters.listingState ||
      filters.brand ||
      filters.city ||
      filters.price ||
      filters.sort !== 'newest' ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.maxMoq ||
      filters.listingType ||
      filters.category,
  );

  const showFeaturedRow =
    activeSection === 'all' && currentPage === 1 && !hasActiveFilters;

  useEffect(() => {
    if (!showFeaturedRow) {
      setFeaturedListings([]);
      return;
    }
    fetchFeaturedMarketplaceListings(8)
      .then((r) => setFeaturedListings(r.items as ListingRow[]))
      .catch(() => setFeaturedListings([]));
  }, [showFeaturedRow]);

  const noResultsForFilters =
    !initialLoading &&
    !error &&
    listings.length === 0 &&
    (hasActiveFilters || activeSection !== 'all');
  const showEmptyState =
    !initialLoading && !error && listings.length === 0 && !noResultsForFilters;
  const showPartnerNudge = !error && !fetching && listings.length > 0;

  const activeFilterChips = useMemo(
    () => buildActiveFilterChips(filters, searchQuery, activeSection),
    [filters, searchQuery, activeSection],
  );

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
          filters,
        );
        if (cancelled) return;
        setListings(items);
        setTotalResults(total);

        const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (total === 0) {
          if (currentPage > 1) {
            replaceSearchParams((params) => {
              params.delete('page');
            });
          }
        } else if (currentPage > maxPage) {
          replaceSearchParams((params) => {
            if (maxPage <= 1) params.delete('page');
            else params.set('page', String(maxPage));
          });
        }
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
    filters,
    replaceSearchParams,
    searchQuery,
  ]);

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
        brandName="GarudHub"
        title="India's B2B marketplace for drones, parts & services"
        description="Browse verified listings from OEMs and partners — compare specs, filter by region and pricing, then buy or request a quote."
        showTrustChips={false}
        sectionClassName="platform-marketplace-hero--compact"
        statStripClassName="platform-marketplace-stat-strip--compact"
        disableHeroImageMotion
        brandLedEntranceAnimation={false}
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
        <div className="platform-marketplace-main">
          <aside
            className="platform-marketplace-sidebar"
            aria-label="Filter listings"
          >
            <div className="platform-marketplace-sidebar__inner">
              <div className="platform-marketplace-sidebar__head">
                <h2 className="platform-marketplace-sidebar__title">Filters</h2>
                <p className="platform-marketplace-sidebar__hint platform-muted">
                  Refine by catalog data from live listings.
                </p>
              </div>
              <MarketplaceFilterFields
                filters={filters}
                facets={facets}
                onChange={updateFilters}
                hasActiveFilters={hasActiveFilters}
                clearAllFilters={clearAllFilters}
              />
            </div>
          </aside>

          <div className="platform-marketplace-main__content platform-marketplace-stack">
            <div className="platform-marketplace-filters-mobile-bar">
              <button
                type="button"
                className="platform-btn platform-btn-secondary platform-marketplace-filters-toggle"
                aria-expanded={mobileFiltersOpen}
                aria-controls={mobileFiltersSheetId}
                onClick={() => setMobileFiltersOpen((open) => !open)}
              >
                <i className="bi bi-sliders" aria-hidden />
                Filters
                {secondaryFilterCount > 0 && (
                  <span
                    className="platform-marketplace-filters-count"
                    aria-label={`${secondaryFilterCount} active filter${secondaryFilterCount === 1 ? '' : 's'}`}
                  >
                    {secondaryFilterCount}
                  </span>
                )}
              </button>
              <MarketplaceActiveFiltersCompact
                filterCount={secondaryFilterCount}
                onClearAll={clearAllFilters}
                hasActiveFilters={hasActiveFilters}
                className="platform-marketplace-active-compact--in-mobile-bar"
              />
            </div>

            {mobileFiltersOpen && (
              <div
                className="platform-marketplace-filters-sheet-overlay"
                role="presentation"
                onClick={() => setMobileFiltersOpen(false)}
              >
                <div
                  id={mobileFiltersSheetId}
                  className="platform-marketplace-filters-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={mobileFiltersTitleId}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="platform-marketplace-filters-sheet__head">
                    <h2
                      id={mobileFiltersTitleId}
                      className="platform-marketplace-filters-sheet__title"
                    >
                      Filters
                    </h2>
                    <button
                      type="button"
                      className="platform-btn platform-btn-secondary platform-btn-sm"
                      onClick={() => setMobileFiltersOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                  <div
                    className="platform-marketplace-filters platform-marketplace-filters--sheet"
                    role="group"
                    aria-label="Refine results"
                  >
                    <MarketplaceFilterFields
                      filters={filters}
                      facets={facets}
                      onChange={updateFilters}
                      hasActiveFilters={hasActiveFilters}
                      clearAllFilters={clearAllFilters}
                    />
                  </div>
                </div>
              </div>
            )}

            <section
              className="platform-marketplace-toolbar"
              aria-label="Search marketplace listings"
            >
              <div className="platform-marketplace-toolbar__intro">
                <p className="platform-marketplace-toolbar__eyebrow">Marketplace</p>
                <h2
                  className="platform-marketplace-toolbar__title"
                  id="marketplace-browse-heading"
                >
                  Explore listings
                </h2>
                <p className="platform-marketplace-toolbar__lede platform-muted">
                  Search, then use the filters on the left to narrow by category, price, brand, and location.
                </p>
              </div>
              <div className="platform-marketplace-toolbar__search-row">
                <MarketplaceSearchField
                  searchDraft={searchDraft}
                  setSearchDraft={setSearchDraft}
                  applySearch={applySearch}
                  className="platform-marketplace-search--desktop platform-marketplace-search--toolbar"
                />
                <MarketplaceActiveFiltersCompact
                  filterCount={secondaryFilterCount}
                  onClearAll={clearAllFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              </div>
            </section>

            <div className="platform-marketplace-section-tabs-wrap">
              <p
                className="platform-marketplace-browse-label"
                id="marketplace-categories"
              >
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

            {showFeaturedRow && featuredListings.length > 0 && !error && (
              <section
                className="platform-marketplace-featured"
                aria-labelledby="marketplace-featured-heading"
              >
                <div className="platform-marketplace-featured__head">
                  <h2
                    id="marketplace-featured-heading"
                    className="platform-marketplace-featured__title platform-section-heading platform-section-heading--lg"
                  >
                    Featured picks
                  </h2>
                  <p className="platform-marketplace-featured__sub platform-muted">
                    Highlighted from verified partners — same inventory as the grid below.
                  </p>
                </div>
                <div className="platform-grid platform-marketplace-featured__grid">
                  {featuredListings.map((item) => (
                    <ListingCard key={item.id} item={item} compare />
                  ))}
                </div>
              </section>
            )}

            {error && (
              <div className="platform-marketplace-error" role="alert">
                <h2 className="platform-marketplace-error-title">
                  Couldn&apos;t load the marketplace
                </h2>
                <p className="platform-marketplace-error-desc">
                  {error}. Check your connection or try again in a moment — your filters are saved.
                </p>
                <button type="button" className="platform-btn platform-btn-cta" onClick={retry}>
                  Retry
                </button>
              </div>
            )}

            {initialLoading && fetching && !error && (
              <section
                className="platform-marketplace-listings platform-marketplace-listings--loading"
                aria-busy="true"
                aria-label="Loading listings"
              >
                <div className="platform-marketplace-listings__head">
                  <div className="platform-marketplace-listings__title-row">
                    <h2 className="platform-marketplace-listings__title platform-section-heading platform-section-heading--lg">
                      All listings
                    </h2>
                    <MarketplaceInlineFilterChips chips={activeFilterChips} />
                  </div>
                </div>
                <div className="platform-grid platform-marketplace-grid--browse">
                  {Array.from({ length: skeletonCount }, (_, i) => (
                    <ListingCardSkeleton key={i} />
                  ))}
                </div>
              </section>
            )}

            {!initialLoading && !error && (
              <div
                className={`platform-marketplace-results${fetching ? ' platform-marketplace-results--fetching' : ''}`}
                aria-busy={fetching}
              >
                {listings.length > 0 && (
                  <section
                    className="platform-marketplace-listings"
                    aria-labelledby="marketplace-all-listings-heading"
                  >
                    <div className="platform-marketplace-listings__head">
                      <div className="platform-marketplace-listings__title-row">
                        <h2
                          id="marketplace-all-listings-heading"
                          className="platform-marketplace-listings__title platform-section-heading platform-section-heading--lg"
                        >
                          All listings
                        </h2>
                        <MarketplaceInlineFilterChips chips={activeFilterChips} />
                      </div>
                    </div>
                    <MarketplacePagination
                      page={currentPage}
                      totalPages={totalPages}
                      total={totalResults}
                      pageSize={PAGE_SIZE}
                      onPage={goToPage}
                      summaryOnly
                    />
                    <div className="platform-grid platform-marketplace-grid--browse">
                      {listings.map((item) => (
                        <ListingCard key={item.id} item={item} compare />
                      ))}
                    </div>
                    <MarketplacePagination
                      page={currentPage}
                      totalPages={totalPages}
                      total={totalResults}
                      pageSize={PAGE_SIZE}
                      onPage={goToPage}
                      controlsOnly
                    />
                  </section>
                )}

                {noResultsForFilters && (
                  <EmptyState
                    title="No listings match your search"
                    description={
                      searchQuery
                        ? `Nothing found for “${searchQuery}” with the current filters. Try fewer filters or post an RFQ — verified vendors will quote for exactly what you need.`
                        : 'No published listings match these filters yet. Try widening your filters or post an RFQ so vendors can respond.'
                    }
                    primaryAction={{
                      label: 'Post a requirement (RFQ)',
                      href: '/buyer/rfqs/new',
                    }}
                    secondaryAction={{
                      label: 'Ask our team',
                      href: `/enquiry?intent=PRODUCT&subject=${encodeURIComponent(
                        searchQuery ? `Looking for: ${searchQuery}` : 'Marketplace sourcing help',
                      )}`,
                    }}
                    icon="🔎"
                  />
                )}
                {noResultsForFilters && (
                  <p className="platform-marketplace-partner-nudge">
                    <button
                      type="button"
                      className="platform-btn platform-btn-secondary platform-btn-sm"
                      onClick={clearAllFilters}
                    >
                      Reset all filters
                    </button>
                  </p>
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

            <MarketplaceRfqBlock />
            <BusinessOpportunitiesBlock />

            {showEmptyState && (
              <div className="platform-marketplace-sticky-cta" aria-hidden={false}>
                <Link href="/auth/register?type=partner" className="platform-btn platform-btn-cta platform-btn-full">
                  Join as partner
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <CompareTray />
    </div>
  );
}
