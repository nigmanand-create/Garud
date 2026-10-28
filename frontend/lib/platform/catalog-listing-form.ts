import { useMemo } from 'react';
import type { CatalogCategory, ListingType } from '@/lib/api/types';

export const COMMON_APPLICATIONS = [
  'Agriculture Spraying',
  'Topographic Survey & Mapping',
  'Industrial & Infrastructure Inspection',
  'Security & Surveillance',
  'Disaster Management & Search & Rescue',
  'Mining & Volumetric Estimation',
  'Powerline & Solar Panel Monitoring',
  'Delivery & Logistics Payload',
];

export type CatalogListingFormValues = {
  listingType: ListingType;
  category: CatalogCategory;
  name: string;
  brand: string;
  sku: string;
  primaryImageUrl: string;
  galleryImageUrlsText: string;
  description: string;
  technicalSpecs: string;
  applications: string[];
  minOrderQuantity: number;
  warranty: string;
  priceOnRequest: boolean;
  priceInr: string;
};

export function emptyCatalogListingForm(
  overrides?: Partial<CatalogListingFormValues>,
): CatalogListingFormValues {
  return {
    listingType: 'PRODUCT',
    category: 'AGRICULTURE_DRONE',
    name: '',
    brand: '',
    sku: '',
    primaryImageUrl: '',
    galleryImageUrlsText: '',
    description: '',
    technicalSpecs: '',
    applications: [],
    minOrderQuantity: 1,
    warranty: '',
    priceOnRequest: true,
    priceInr: '',
    ...overrides,
  };
}

export function useCatalogListingReadiness(form: CatalogListingFormValues) {
  return useMemo(() => {
    const checks = [
      { label: 'Product name specified', done: form.name.trim().length >= 3 },
      { label: 'Brand / OEM identified', done: form.brand.trim().length >= 2 },
      { label: 'Primary photo uploaded', done: Boolean(form.primaryImageUrl.trim()) },
      {
        label: 'Pricing terms configured',
        done: form.priceOnRequest || Number(form.priceInr) > 0,
      },
      {
        label: 'Technical specs provided',
        done: form.technicalSpecs.trim().length >= 20,
      },
      {
        label: 'Product description written',
        done: form.description.trim().length >= 30,
      },
    ];
    const completedCount = checks.filter((c) => c.done).length;
    const score = Math.round((completedCount / checks.length) * 100);
    return { score, checks };
  }, [form]);
}

export function buildListingPayload(form: CatalogListingFormValues) {
  return {
    listingType: form.listingType,
    category: form.category,
    name: form.name.trim(),
    brand: form.brand.trim() || undefined,
    sku: form.sku.trim() || undefined,
    primaryImageUrl: form.primaryImageUrl.trim() || undefined,
    description: form.description.trim() || undefined,
    technicalSpecs: form.technicalSpecs.trim() || undefined,
    applications: form.applications.length > 0 ? form.applications : undefined,
    minOrderQuantity:
      form.minOrderQuantity > 0 ? Number(form.minOrderQuantity) : undefined,
    warranty: form.warranty.trim() || undefined,
    priceOnRequest: form.priceOnRequest,
    priceInr: form.priceOnRequest ? undefined : Number(form.priceInr),
  };
}
