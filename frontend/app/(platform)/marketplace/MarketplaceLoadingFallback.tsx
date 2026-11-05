import { ListingCardSkeleton } from '@/components/platform/ListingCard';

const SKELETON_COUNT = 8;

/** Suspense fallback — matches MarketplaceClient initial listing grid. */
export function MarketplaceLoadingFallback() {
  return (
    <div className="platform-marketplace-page">
      <div className="platform-marketplace-body">
        <div className="platform-grid" aria-busy="true" aria-label="Loading marketplace">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
