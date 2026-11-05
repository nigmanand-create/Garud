import { Suspense } from 'react';
import { MarketplaceClient } from './MarketplaceClient';
import { MarketplaceLoadingFallback } from './MarketplaceLoadingFallback';

export default function MarketplacePage() {
  return (
    <Suspense fallback={<MarketplaceLoadingFallback />}>
      <MarketplaceClient />
    </Suspense>
  );
}
