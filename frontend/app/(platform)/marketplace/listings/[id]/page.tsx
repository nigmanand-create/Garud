'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { addToCart, clearCart } from '@/lib/api/cart';
import {
  effectiveCartMinQuantity,
  isSingleSellerConflict,
  SINGLE_SELLER_POLICY,
} from '@/lib/platform/cart';
import { useAuth } from '@/components/platform/AuthProvider';
import type { CatalogCategory, ListingType } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  formatPrice,
} from '@/lib/platform/labels';
import { resolveListingImageUrl } from '@/lib/platform/listing-media';
import { CompareToggle } from '@/components/platform/CompareToggle';
import { CompareTray } from '@/components/platform/CompareTray';
import { MessageSupplierButton } from '@/components/platform/MessageSupplierButton';
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
  const [sellerConflict, setSellerConflict] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cartToast, setCartToast] = useState<string | null>(null);
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

  useEffect(() => {
    if (!cartToast) return;
    const t = window.setTimeout(() => setCartToast(null), 5000);
    return () => clearTimeout(t);
  }, [cartToast]);

  if (loading) {
    return (
      <div className="platform-grid" aria-busy="true">
        <div className="platform-skeleton platform-skeleton-line platform-skeleton-line--short" />
        <div className="platform-skeleton platform-skeleton-line platform-skeleton-line--medium platform-skeleton-line--title" />
      </div>
    );
  }
  if (error || !listing) {
    return <div className="platform-card platform-error">{error ?? 'Not found'}</div>;
  }

  async function handleAddToCart(
    replaceCart: boolean,
    redirectTo: 'cart' | 'checkout' | 'stay',
  ) {
    if (!listing) return;
    setCartError(null);
    setSellerConflict(false);
    if (!isBuyer) {
      router.push('/auth/login');
      return;
    }
    const qty = effectiveCartMinQuantity(listing.minOrderQuantity);
    setAdding(true);
    try {
      // One seller per cart: replacing means clearing the existing (other-seller) cart first.
      if (replaceCart) await clearCart();
      await addToCart(listing.id, qty);
      const vendorQs = `?vendor=${encodeURIComponent(listing.organization.id)}`;
      if (redirectTo === 'stay') {
        setCartToast(`Added ${qty} unit${qty > 1 ? 's' : ''} to cart.`);
        return;
      }
      router.push(redirectTo === 'checkout' ? `/buyer/checkout${vendorQs}` : '/buyer/cart');
    } catch (e) {
      if (isSingleSellerConflict(e)) {
        setSellerConflict(true);
      } else {
        setCartError(e instanceof ApiError ? e.message : 'Could not add to cart');
      }
    } finally {
      setAdding(false);
    }
  }

  const sectionId = sectionForListing(listing.category, listing.listingType);
  const section = sectionId ? sectionById(sectionId) : null;

  const primarySrc = resolveListingImageUrl(listing.primaryImageUrl);

  const demoSubject = `Request demo: ${listing.name}${
    listing.sku ? ` (SKU: ${listing.sku})` : ''
  }`;
  const enquirySubject = `Enquiry for ${listing.name}${
    listing.sku ? ` (SKU: ${listing.sku})` : ''
  }`;

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
                <p className="platform-pre-wrap">{listing.description}</p>
              </>
            )}
            {listing.technicalSpecs && (
              <>
                <h3>Technical specs</h3>
                <p className="platform-pre-wrap">{listing.technicalSpecs}</p>
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
            <p className="platform-detail-price">
              {formatPrice(listing.priceOnRequest, listing.priceInr)}
            </p>
            {listing.minOrderQuantity != null && listing.minOrderQuantity > 1 && (
              <p className="platform-muted platform-text-muted-sm">
                Minimum order: {listing.minOrderQuantity} units (enforced at checkout)
              </p>
            )}
            {listing.warranty && (
              <p className="platform-muted platform-text-muted-sm platform-mt-md">
                Warranty: {listing.warranty}
              </p>
            )}
            <div className="platform-action-stack platform-mt-md">
              <Link
                href={`/buyer/rfqs/new?listing=${listing.id}`}
                className="platform-btn platform-btn-cta platform-btn-full"
              >
                <span aria-hidden>🏆</span> Request B2B Quotation (RFQ)
              </Link>

              <Link
                href={`/enquiry?listing=${listing.id}&intent=DEMO&subject=${encodeURIComponent(demoSubject)}`}
                className="platform-btn platform-btn-secondary platform-btn-full"
              >
                <span aria-hidden>▶</span> Request demo
              </Link>

              <Link
                href={`/enquiry?listing=${listing.id}&intent=PRODUCT&subject=${encodeURIComponent(enquirySubject)}`}
                className="platform-btn platform-btn-secondary platform-btn-full"
              >
                <span aria-hidden>💬</span> Contact supplier
              </Link>

              <MessageSupplierButton
                organizationId={listing.organization.id}
                listingId={listing.id}
                defaultSubject={enquirySubject}
              />

              <Link
                href={`/marketplace/distributor?listing=${listing.id}&type=DISTRIBUTOR`}
                className="platform-btn-ghost-distributor"
              >
                <span aria-hidden>🤝</span> Become a Regional Distributor
              </Link>

              <CompareToggle
                listingId={listing.id}
                className="platform-btn platform-btn-secondary platform-btn-full"
              />

              {canAddToCart && (
                <div className="platform-cart-add-divider">
                  <div className="platform-action-stack platform-mt-sm">
                    <button
                      type="button"
                      className="platform-btn platform-btn-secondary platform-btn-full"
                      disabled={adding}
                      onClick={() => handleAddToCart(false, 'stay')}
                    >
                      <span aria-hidden>🛒</span> Add to cart (
                      {formatPrice(listing.priceOnRequest, listing.priceInr)})
                    </button>
                    <button
                      type="button"
                      className="platform-btn platform-btn-cta platform-btn-full"
                      disabled={adding}
                      onClick={() => handleAddToCart(false, 'checkout')}
                    >
                      Buy now
                    </button>
                  </div>
                  <p className="platform-muted platform-text-muted-sm platform-mt-sm">
                    Cart and checkout are per seller. MOQ is applied when adding to the cart.
                  </p>
                  {cartToast && (
                    <div className="platform-cart-toast" role="status">
                      <span>{cartToast}</span>
                      <Link href="/buyer/cart" className="platform-btn platform-btn-secondary platform-btn-sm">
                        View cart
                      </Link>
                      <button
                        type="button"
                        className="platform-cart-toast-dismiss"
                        aria-label="Dismiss"
                        onClick={() => setCartToast(null)}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {cartError && (
                    <p className="platform-error platform-text-muted-sm platform-mt-sm">{cartError}</p>
                  )}
                  {sellerConflict && (
                    <div className="platform-notice-warn platform-card platform-mt-sm" role="alert">
                      <p className="platform-text-sm">
                        <strong>Your cart has items from another seller.</strong> {SINGLE_SELLER_POLICY}
                      </p>
                      <p className="platform-link-row">
                        <Link href="/buyer/cart" className="platform-btn platform-btn-secondary platform-btn-sm">
                          Go to cart
                        </Link>{' '}
                        <button
                          type="button"
                          className="platform-btn platform-btn-sm"
                          disabled={adding}
                          onClick={() => handleAddToCart(true, 'cart')}
                        >
                          Clear cart &amp; add this item
                        </button>{' '}
                        <button
                          type="button"
                          className="platform-btn platform-btn-sm platform-btn-secondary"
                          disabled={adding}
                          onClick={() => handleAddToCart(true, 'checkout')}
                        >
                          Clear cart &amp; buy now
                        </button>{' '}
                        <Link href="/buyer/rfqs/new" className="platform-btn platform-btn-secondary platform-btn-sm">
                          Raise an RFQ instead
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="platform-muted platform-assurance-note">
              🔒 <strong>B2B Assurance:</strong> Verified DGCA Type specifications, milestone escrow protection &amp; PAN-India delivery.
            </p>
          </div>

          <div className="platform-card platform-card--spaced-top">
            <h3 className="platform-section-heading">Sold by</h3>
            <p className="platform-stat-spec-value">
              <Link href={`/marketplace/partners/${listing.organization.id}`}>
                {listing.organization.companyName}
              </Link>
            </p>
            <p className="platform-muted platform-text-muted-sm">
              {[listing.organization.city, listing.organization.state, listing.organization.country]
                .filter(Boolean)
                .join(', ')}
            </p>
            {listing.organization.website && (
              <p className="platform-mt-sm">
                <a
                  href={listing.organization.website}
                  target="_blank"
                  rel="noreferrer"
                  className="platform-inline-link"
                >
                  Visit website
                </a>
              </p>
            )}
          </div>
        </aside>
      </div>
      <CompareTray />
    </>
  );
}
