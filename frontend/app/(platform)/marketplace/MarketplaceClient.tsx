'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
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

type ListingRow = ListingCardData;

function listingMatchesSection(item: ListingRow, section: MarketplaceSection): boolean {
  if (section.listingType && item.listingType !== section.listingType) return false;
  if (section.categories?.length && !section.categories.includes(item.category)) {
    return false;
  }
  return true;
}

async function fetchSectionListings(section: MarketplaceSection): Promise<ListingRow[]> {
  const params = new URLSearchParams();
  if (section.listingType) params.set('listingType', section.listingType);
  if (section.categories?.length === 1) {
    params.set('category', section.categories[0]);
  }
  params.set('take', String(section.take * 2));
  const rows = await apiRequest<ListingRow[]>(`/marketplace/listings?${params}`);
  return rows
    .filter((row) => listingMatchesSection(row, section))
    .slice(0, section.take);
}

async function fetchAllListings(): Promise<ListingRow[]> {
  const params = new URLSearchParams();
  params.set('take', '48');
  return apiRequest<ListingRow[]>(`/marketplace/listings?${params}`);
}

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

const TAB_ITEMS = [
  { id: 'all' as const, label: 'All' },
  ...MARKETPLACE_SECTIONS.map((s) => ({ id: s.id, label: s.shortLabel ?? s.title })),
];

export function MarketplaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = useMemo(
    () => parseSectionFromSearch(searchParams),
    [searchParams],
  );

  const [sectionData, setSectionData] = useState<
    Partial<Record<MarketplaceSectionId, ListingRow[]>>
  >({});
  const [allListings, setAllListings] = useState<ListingRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchGeneration, setFetchGeneration] = useState(0);

  const activeSectionConfig = useMemo(() => {
    if (activeSection === 'all') return null;
    return sectionById(activeSection);
  }, [activeSection]);

  const combinedListings = useMemo(() => {
    if (activeSection === 'all') return allListings;
    const section = activeSectionConfig;
    if (!section) return [];
    return sectionData[section.id] ?? [];
  }, [activeSection, activeSectionConfig, allListings, sectionData]);

  const showEmptyState =
    !initialLoading && !error && combinedListings.length === 0;
  const showPartnerNudge =
    !error && !fetching && combinedListings.length > 0;

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
        if (activeSection === 'all') {
          const listings = await fetchAllListings();
          if (cancelled) return;
          setAllListings(listings);
          return;
        }
        const section = activeSectionConfig;
        if (!section) return;
        const listings = await fetchSectionListings(section);
        if (cancelled) return;
        setSectionData((prev) => ({ ...prev, [section.id]: listings }));
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
  }, [activeSection, activeSectionConfig, fetchGeneration]);

  const setSection = useCallback(
    (id: MarketplaceSectionId | 'all') => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('type');
      params.delete('listingType');
      params.delete('category');
      if (id === 'all') params.delete('section');
      else params.set('section', id);
      const q = params.toString();
      router.replace(q ? `/marketplace?${q}` : '/marketplace', { scroll: false });
    },
    [router, searchParams],
  );

  const retry = useCallback(() => {
    setFetchGeneration((n) => n + 1);
  }, []);

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
          {combinedListings.length > 0 && (
            <>
              {activeSection === 'all' && (
                <p className="platform-marketplace-results-hint platform-muted">
                  Showing listings across categories. Pick a tab above to narrow your search.
                </p>
              )}
              <div className="platform-grid">
                {combinedListings.map((item) => (
                  <ListingCard key={item.id} item={item} />
                ))}
              </div>
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
                href: '/enquiry.php',
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
