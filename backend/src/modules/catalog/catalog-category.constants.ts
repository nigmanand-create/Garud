import { CatalogCategory, ListingType } from '@prisma/client';

export const PRODUCT_CATALOG_CATEGORIES: CatalogCategory[] = [
  CatalogCategory.AGRICULTURE_DRONE,
  CatalogCategory.SURVEY_MAPPING_DRONE,
  CatalogCategory.INDUSTRIAL_ENTERPRISE_DRONE,
  CatalogCategory.CAMERA_DRONE,
  CatalogCategory.COMPONENT,
  CatalogCategory.ACCESSORY,
  CatalogCategory.PAYLOAD,
  CatalogCategory.OTHER,
];

export const SERVICE_CATALOG_CATEGORIES: CatalogCategory[] = [
  CatalogCategory.REPAIR_MAINTENANCE,
  CatalogCategory.TRAINING,
  CatalogCategory.CONSULTANCY,
  CatalogCategory.OTHER,
];

const CATEGORIES_BY_LISTING_TYPE: Record<ListingType, CatalogCategory[]> = {
  [ListingType.PRODUCT]: PRODUCT_CATALOG_CATEGORIES,
  [ListingType.SERVICE]: SERVICE_CATALOG_CATEGORIES,
};

export function categoryAllowedForListingType(
  category: CatalogCategory,
  listingType: ListingType,
): boolean {
  return CATEGORIES_BY_LISTING_TYPE[listingType].includes(category);
}
