import type { CatalogCategory, ListingType } from '@/lib/api/types';

/** Hardware / equipment marketplace categories (aligned with marketplace sections). */
export const PRODUCT_CATALOG_CATEGORIES: CatalogCategory[] = [
  'AGRICULTURE_DRONE',
  'SURVEY_MAPPING_DRONE',
  'INDUSTRIAL_ENTERPRISE_DRONE',
  'CAMERA_DRONE',
  'COMPONENT',
  'ACCESSORY',
  'PAYLOAD',
  'OTHER',
];

/** Service offering marketplace categories. */
export const SERVICE_CATALOG_CATEGORIES: CatalogCategory[] = [
  'REPAIR_MAINTENANCE',
  'TRAINING',
  'CONSULTANCY',
  'OTHER',
];

const CATEGORIES_BY_LISTING_TYPE: Record<ListingType, CatalogCategory[]> = {
  PRODUCT: PRODUCT_CATALOG_CATEGORIES,
  SERVICE: SERVICE_CATALOG_CATEGORIES,
};

export function catalogCategoriesForListingType(
  listingType: ListingType,
): CatalogCategory[] {
  return CATEGORIES_BY_LISTING_TYPE[listingType];
}

export function isCatalogCategoryValidForListingType(
  category: CatalogCategory,
  listingType: ListingType,
): boolean {
  return CATEGORIES_BY_LISTING_TYPE[listingType].includes(category);
}

export function defaultCatalogCategoryForListingType(
  listingType: ListingType,
): CatalogCategory {
  return CATEGORIES_BY_LISTING_TYPE[listingType][0];
}

/** When listing type changes, keep category if still valid; otherwise use type default. */
export function resolveCatalogCategoryForListingType(
  category: CatalogCategory,
  listingType: ListingType,
): CatalogCategory {
  return isCatalogCategoryValidForListingType(category, listingType)
    ? category
    : defaultCatalogCategoryForListingType(listingType);
}
