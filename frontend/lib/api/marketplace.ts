import { apiRequest } from './client';
import type {
  CatalogCategory,
  ListingType,
  MarketplaceListingsResponse,
} from './types';

export type BrowseMarketplaceParams = {
  listingType?: ListingType;
  category?: CatalogCategory;
  categories?: CatalogCategory[];
  q?: string;
  skip?: number;
  take?: number;
};

export function browseMarketplaceListings(params?: BrowseMarketplaceParams) {
  const search = new URLSearchParams();
  if (params?.listingType) search.set('listingType', params.listingType);
  if (params?.category) search.set('category', params.category);
  if (params?.categories?.length) {
    search.set('categories', params.categories.join(','));
  }
  if (params?.q?.trim()) search.set('q', params.q.trim());
  if (params?.skip != null) search.set('skip', String(params.skip));
  if (params?.take != null) search.set('take', String(params.take));
  const q = search.toString();
  return apiRequest<MarketplaceListingsResponse>(
    `/marketplace/listings${q ? `?${q}` : ''}`,
  );
}
