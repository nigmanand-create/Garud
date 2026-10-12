import type { CatalogCategory, ListingType } from '@/lib/api/types';

export type MarketplaceSectionId =
  | 'drones'
  | 'accessories'
  | 'components'
  | 'courses'
  | 'services';

export type MarketplaceSection = {
  id: MarketplaceSectionId;
  title: string;
  /** Shorter label for category chips (avoids clutter next to header nav). */
  shortLabel?: string;
  description: string;
  listingType?: ListingType;
  /** When set, listing must match one of these categories. */
  categories?: CatalogCategory[];
  take: number;
};

/** PRD marketplace columns mapped to public API `listingType` + `category` filters. */
export const MARKETPLACE_SECTIONS: MarketplaceSection[] = [
  {
    id: 'drones',
    title: 'Drones',
    description: 'Agriculture, survey, industrial, and camera platforms from verified partners.',
    listingType: 'PRODUCT',
    categories: [
      'AGRICULTURE_DRONE',
      'SURVEY_MAPPING_DRONE',
      'INDUSTRIAL_ENTERPRISE_DRONE',
      'CAMERA_DRONE',
    ],
    take: 8,
  },
  {
    id: 'accessories',
    title: 'Accessories',
    description: 'Batteries, propellers, cases, and add-ons for your fleet.',
    listingType: 'PRODUCT',
    categories: ['ACCESSORY'],
    take: 8,
  },
  {
    id: 'components',
    title: 'Components & payloads',
    shortLabel: 'Components',
    description: 'Frames, sensors, payloads, and spare parts.',
    listingType: 'PRODUCT',
    categories: ['COMPONENT', 'PAYLOAD'],
    take: 8,
  },
  {
    id: 'courses',
    title: 'Courses & training',
    shortLabel: 'Training',
    description: 'DGCA-aligned and professional drone training programs.',
    listingType: 'SERVICE',
    categories: ['TRAINING'],
    take: 8,
  },
  {
    id: 'services',
    title: 'Services',
    description: 'Repairs, maintenance, consultancy, and other partner services.',
    listingType: 'SERVICE',
    categories: ['REPAIR_MAINTENANCE', 'CONSULTANCY', 'OTHER'],
    take: 8,
  },
];

export function sectionById(id: string): MarketplaceSection | undefined {
  return MARKETPLACE_SECTIONS.find((s) => s.id === id);
}

/** Build query string for a single listing filter (first category when multiple). */
export function sectionPrimaryQuery(section: MarketplaceSection): URLSearchParams {
  const params = new URLSearchParams();
  if (section.listingType) params.set('listingType', section.listingType);
  if (section.categories?.length === 1) {
    params.set('category', section.categories[0]);
  }
  params.set('section', section.id);
  return params;
}
