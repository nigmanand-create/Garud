import { ListingCardSkeleton } from '@/components/platform/ListingCard';

const SKELETON_COUNT = 8;

/** Suspense fallback — mirrors marketplace page chrome (toolbar, tabs, grid). */
export function MarketplaceLoadingFallback() {
  return (
    <div className="platform-marketplace-page">
      <div className="platform-marketplace-loading-hero" aria-hidden>
        <div className="platform-marketplace-loading-hero__shine" />
        <div className="platform-marketplace-loading-hero__inner wrap">
          <span className="platform-marketplace-loading-pill" />
          <span className="platform-marketplace-loading-line platform-marketplace-loading-line--lg" />
          <span className="platform-marketplace-loading-line platform-marketplace-loading-line--md" />
          <span className="platform-marketplace-loading-line platform-marketplace-loading-line--short" />
        </div>
      </div>
      <div className="platform-marketplace-body">
        <div className="platform-marketplace-stack">
          <section className="platform-marketplace-toolbar" aria-hidden>
            <div className="platform-marketplace-toolbar__intro">
              <span className="platform-marketplace-loading-pill" />
              <span className="platform-marketplace-loading-line platform-marketplace-loading-line--title" />
              <span className="platform-marketplace-loading-line platform-marketplace-loading-line--lede" />
            </div>
            <div
              className="platform-marketplace-loading-search"
              aria-hidden
            />
          </section>

          <div className="platform-marketplace-browse" aria-hidden>
            <span className="platform-marketplace-loading-line platform-marketplace-loading-line--label" />
            <div className="platform-marketplace-loading-tabs">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="platform-marketplace-loading-tab" />
              ))}
            </div>
          </div>

          <section
            className="platform-marketplace-listings platform-marketplace-listings--loading"
            aria-busy="true"
            aria-label="Loading marketplace"
          >
            <div className="platform-marketplace-listings__head">
              <span className="platform-marketplace-loading-line platform-marketplace-loading-line--section" />
            </div>
            <div className="platform-grid platform-marketplace-grid--browse">
              {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
