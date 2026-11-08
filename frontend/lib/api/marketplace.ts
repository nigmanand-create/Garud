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
  /** Verified vendor org state */
  state?: string;
  /** Listing-level state (seller-entered on catalog row) */
  listingState?: string;
  brand?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Listings with no MOQ or MOQ ≤ this value */
  maxMoq?: number;
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
  if (params?.listingState?.trim())
    search.set('listingState', params.listingState.trim());
  if (params?.brand?.trim()) search.set('brand', params.brand.trim());
  if (params?.city?.trim()) search.set('city', params.city.trim());
  if (params?.minPrice != null && Number.isFinite(params.minPrice))
    search.set('minPrice', String(params.minPrice));
  if (params?.maxPrice != null && Number.isFinite(params.maxPrice))
    search.set('maxPrice', String(params.maxPrice));
  if (params?.maxMoq != null && Number.isFinite(params.maxMoq))
    search.set('maxMoq', String(params.maxMoq));
  if (params?.priceType) search.set('priceType', params.priceType);
  if (params?.sort && params.sort !== 'newest') search.set('sort', params.sort);
  if (params?.skip != null) search.set('skip', String(params.skip));
  if (params?.take != null) search.set('take', String(params.take));
  const q = search.toString();
  return apiRequest<MarketplaceListingsResponse>(
    `/marketplace/listings${q ? `?${q}` : ''}`,
  );
}

export type MarketplaceFacets = {
  states: string[];
  categories: CatalogCategory[];
  listingTypes: ListingType[];
  brands: string[];
  cities: string[];
  listingStates: string[];
  priceInr: { min: string; max: string } | null;
  moqMax: number | null;
};

export function fetchMarketplaceFacets() {
  return apiRequest<MarketplaceFacets>('/marketplace/filters');
}

export function fetchFeaturedMarketplaceListings(take = 8) {
  return apiRequest<{ items: MarketplaceListingsResponse['items'] }>(
    `/marketplace/listings/featured?take=${take}`,
  );
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
