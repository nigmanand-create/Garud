import Link from 'next/link';
import type { CatalogCategory, ListingType } from '@/lib/api/types';
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  formatPrice,
} from '@/lib/platform/labels';
import { resolveListingImageUrl } from '@/lib/platform/listing-media';

export type ListingCardData = {
  id: string;
  name: string;
  listingType: ListingType;
  category: CatalogCategory;
  primaryImageUrl?: string | null;
  priceOnRequest: boolean;
  priceInr?: string | null;
  organization: {
    id: string;
    companyName: string;
    city?: string | null;
    state?: string | null;
  };
};

export function ListingCard({ item }: { item: ListingCardData }) {
  const location = [item.organization.city, item.organization.state]
    .filter(Boolean)
    .join(', ');
  const imageSrc = resolveListingImageUrl(item.primaryImageUrl);

  return (
    <article className="platform-listing-card">
      <Link
        href={`/marketplace/listings/${item.id}`}
        className="platform-listing-card-link"
      >
        <div className="platform-listing-card-media" aria-hidden>
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt=""
              className="platform-listing-card-media-img"
            />
          ) : (
            <span className="platform-listing-card-media-icon">✦</span>
          )}
        </div>
        <div className="platform-listing-card-body">
          <div className="platform-listing-card-badges">
            <span className="platform-badge platform-badge--category">
              {CATEGORY_LABELS[item.category]}
            </span>
            <span className="platform-badge platform-badge--muted">
              {LISTING_TYPE_LABELS[item.listingType]}
            </span>
          </div>
          <h3 className="platform-listing-card-title">{item.name}</h3>
          <p className="platform-listing-card-price">
            {formatPrice(item.priceOnRequest, item.priceInr)}
          </p>
          <p className="platform-listing-card-partner">
            <span className="platform-listing-card-partner-name">
              {item.organization.companyName}
            </span>
            {location && (
              <span className="platform-listing-card-location">{location}</span>
            )}
          </p>
        </div>
      </Link>
      <div className="platform-listing-card-footer">
        <Link
          href={`/marketplace/listings/${item.id}`}
          className="platform-listing-card-cta"
        >
          View details
        </Link>
        <Link
          href={`/marketplace/partners/${item.organization.id}`}
          className="platform-listing-card-partner-link"
        >
          Partner profile
        </Link>
      </div>
    </article>
  );
}

export function ListingCardSkeleton() {
  return (
    <article className="platform-listing-card platform-listing-card--skeleton" aria-hidden>
      <div className="platform-listing-card-media platform-skeleton" />
      <div className="platform-listing-card-body">
        <div className="platform-skeleton platform-skeleton-line platform-skeleton-line--short" />
        <div className="platform-skeleton platform-skeleton-line" />
        <div className="platform-skeleton platform-skeleton-line platform-skeleton-line--medium" />
      </div>
      <div className="platform-listing-card-footer platform-listing-card-footer--skeleton">
        <div className="platform-skeleton platform-skeleton-line platform-skeleton-line--short" />
      </div>
    </article>
  );
}
