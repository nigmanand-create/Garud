'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { addToCart } from '@/lib/api/cart';
import { useAuth } from '@/components/platform/AuthProvider';
import type { CatalogCategory, ListingType } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  formatPrice,
} from '@/lib/platform/labels';
import { resolveListingImageUrl } from '@/lib/platform/listing-media';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { sectionById } from '@/lib/platform/marketplace-sections';
import type { MarketplaceSectionId } from '@/lib/platform/marketplace-sections';

type ListingDetail = {
  id: string;
  name: string;
  brand?: string | null;
  listingType: ListingType;
  category: CatalogCategory;
  description?: string | null;
  technicalSpecs?: string | null;
  applications: string[];
  sku?: string | null;
  primaryImageUrl?: string | null;
  galleryImageUrls?: string[];
  priceOnRequest: boolean;
  priceInr?: string | null;
  minOrderQuantity?: number | null;
  warranty?: string | null;
  organization: {
    id: string;
    companyName: string;
    country?: string | null;
    state?: string | null;
    city?: string | null;
    website?: string | null;
  };
};

function sectionForListing(category: CatalogCategory, listingType: ListingType): MarketplaceSectionId | null {
  const sections = [
    'drones',
    'accessories',
    'components',
    'courses',
    'services',
  ] as MarketplaceSectionId[];
  for (const id of sections) {
    const s = sectionById(id);
    if (!s) continue;
    if (s.listingType && s.listingType !== listingType) continue;
    if (s.categories?.length && !s.categories.includes(category)) continue;
    return id;
  }
  return null;
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const isBuyer = user?.role === 'BUYER' || user?.role === 'GOVERNMENT';
  const canAddToCart =
    listing && !listing.priceOnRequest && listing.priceInr != null;

  useEffect(() => {
    apiRequest<ListingDetail>(`/marketplace/listings/${id}`)
      .then(setListing)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Listing not found'),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="platform-grid" aria-busy="true">
        <div className="platform-skeleton" style={{ height: 12, width: '40%', marginBottom: 1 }} />
        <div className="platform-skeleton" style={{ height: 28, width: '70%' }} />
      </div>
    );
  }
  if (error || !listing) {
    return <div className="platform-card platform-error">{error ?? 'Not found'}</div>;
  }

  const sectionId = sectionForListing(listing.category, listing.listingType);
  const section = sectionId ? sectionById(sectionId) : null;

  const primarySrc = resolveListingImageUrl(listing.primaryImageUrl);

  const breadcrumbs = [
    { label: 'Marketplace', href: '/marketplace' },
    ...(section
      ? [
          {
            label: section.title,
            href: `/marketplace?section=${section.id}`,
          },
        ]
      : []),
    { label: listing.name },
  ];

  return (
    <>
      <PlatformPageHeader
        breadcrumbs={breadcrumbs}
        title={listing.name}
        subtitle={
          <>
            {LISTING_TYPE_LABELS[listing.listingType]} · {CATEGORY_LABELS[listing.category]}
            {listing.brand ? ` · ${listing.brand}` : ''}
          </>
        }
      />

      <div className="platform-detail-layout">
        <div>
          <div className="platform-detail-media" aria-hidden>
            {primarySrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primarySrc}
                alt=""
                className="platform-detail-media-img"
              />
            ) : (
              '✦'
            )}
          </div>
          {listing.galleryImageUrls && listing.galleryImageUrls.length > 0 && (
            <div className="platform-detail-gallery" aria-label="More images">
              {listing.galleryImageUrls.map((url) => {
                const src = resolveListingImageUrl(url);
                if (!src) return null;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={src}
                    alt=""
                    className="platform-detail-gallery-thumb"
                  />
                );
              })}
            </div>
          )}
          <div className="platform-card platform-prose">
            {listing.sku && (
              <>
                <h3>SKU / model</h3>
                <p>{listing.sku}</p>
              </>
            )}
            {listing.description && (
              <>
                <h3>Description</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{listing.description}</p>
              </>
            )}
            {listing.technicalSpecs && (
              <>
                <h3>Technical specs</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{listing.technicalSpecs}</p>
              </>
            )}
            {listing.applications?.length > 0 && (
              <>
                <h3>Applications</h3>
                <p>{listing.applications.join(', ')}</p>
              </>
            )}
          </div>
        </div>

        <aside className="platform-detail-sidebar">
          <div className="platform-card">
            <p style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 700 }}>
              {formatPrice(listing.priceOnRequest, listing.priceInr)}
            </p>
            {listing.minOrderQuantity != null && (
              <p className="platform-muted" style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>
                MOQ: {listing.minOrderQuantity}
              </p>
            )}
            {listing.warranty && (
              <p className="platform-muted" style={{ margin: '0 0 1rem', fontSize: '0.875rem' }}>
                Warranty: {listing.warranty}
              </p>
            )}
            {canAddToCart ? (
              <>
                {cartError && (
                  <p className="platform-error" style={{ fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                    {cartError}
                  </p>
                )}
                <button
                  type="button"
                  className="platform-btn platform-btn-cta platform-btn-full"
                  disabled={adding}
                  onClick={async () => {
                    setCartError(null);
                    if (!isBuyer) {
                      router.push('/auth/login');
                      return;
                    }
                    setAdding(true);
                    try {
                      await addToCart(listing.id, listing.minOrderQuantity ?? 1);
                      router.push('/buyer/cart');
                    } catch (e) {
                      setCartError(
                        e instanceof ApiError ? e.message : 'Could not add to cart',
                      );
                    } finally {
                      setAdding(false);
                    }
                  }}
                >
                  Add to cart
                </button>
                <Link
                  href="/buyer/cart"
                  className="platform-btn platform-btn-secondary platform-btn-full"
                  style={{ marginTop: '0.5rem' }}
                >
                  View cart
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={`/buyer/rfqs/new?listing=${listing.id}`}
                  className="platform-btn platform-btn-cta platform-btn-full"
                >
                  Request quotation
                </Link>
                <Link
                  href="/enquiry.php"
                  className="platform-btn platform-btn-secondary platform-btn-full"
                  style={{ marginTop: '0.5rem' }}
                >
                  Request enquiry
                </Link>
              </>
            )}
            <p
              className="platform-muted"
              style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', textAlign: 'center' }}
            >
              {canAddToCart
                ? 'Single-vendor cart — checkout with one seller at a time'
                : 'Price on request — use RFQ for structured quotes'}
            </p>
          </div>

          <div className="platform-card" style={{ marginTop: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem' }}>Sold by</h3>
            <p style={{ margin: '0 0 0.35rem', fontWeight: 600 }}>
              <Link href={`/marketplace/partners/${listing.organization.id}`}>
                {listing.organization.companyName}
              </Link>
            </p>
            <p className="platform-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
              {[listing.organization.city, listing.organization.state, listing.organization.country]
                .filter(Boolean)
                .join(', ')}
            </p>
            {listing.organization.website && (
              <p style={{ margin: '0.75rem 0 0' }}>
                <a
                  href={listing.organization.website}
                  target="_blank"
                  rel="noreferrer"
                  className="platform-auth-link-accent"
                >
                  Visit website
                </a>
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
