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
  state?: string;
  priceType?: 'priced' | 'rfq';
  sort?: 'newest' | 'price_asc' | 'price_desc';
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
  if (params?.state?.trim()) search.set('state', params.state.trim());
  if (params?.priceType) search.set('priceType', params.priceType);
  if (params?.sort && params.sort !== 'newest') search.set('sort', params.sort);
  if (params?.skip != null) search.set('skip', String(params.skip));
  if (params?.take != null) search.set('take', String(params.take));
  const q = search.toString();
  return apiRequest<MarketplaceListingsResponse>(
    `/marketplace/listings${q ? `?${q}` : ''}`,
  );
}

export type MarketplaceFacets = { states: string[] };

export function fetchMarketplaceFacets() {
  return apiRequest<MarketplaceFacets>('/marketplace/filters');
}

export type CompareListingDetail = {
  id: string;
  name: string;
  brand?: string | null;
  listingType: ListingType;
  category: CatalogCategory;
  technicalSpecs?: string | null;
  applications: string[];
  sku?: string | null;
  primaryImageUrl?: string | null;
  priceOnRequest: boolean;
  priceInr?: string | null;
  minOrderQuantity?: number | null;
  warranty?: string | null;
  organization: {
    id: string;
    companyName: string;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  };
};

export function fetchCompareListings(ids: string[]) {
  return apiRequest<{ items: CompareListingDetail[] }>(
    `/marketplace/listings/compare?ids=${encodeURIComponent(ids.join(','))}`,
  );
}
