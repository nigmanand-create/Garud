import { Suspense } from 'react';
import { MarketplaceClient } from './MarketplaceClient';

export default function MarketplacePage() {
  return (
    <Suspense fallback={<p className="platform-muted">Loading marketplace…</p>}>
      <MarketplaceClient />
    </Suspense>
  );
}
