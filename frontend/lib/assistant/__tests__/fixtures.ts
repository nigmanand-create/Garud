import type { AssistantListing } from '../types';

export function mockListing(
  overrides: Partial<AssistantListing> & Pick<AssistantListing, 'id' | 'name' | 'category'>,
): AssistantListing {
  return {
    listingType: 'PRODUCT',
    priceOnRequest: false,
    priceInr: '285000',
    primaryImageUrl: null,
    organization: {
      id: 'org-1',
      companyName: 'Garud Demo Partner',
      city: 'Chandigarh',
      state: 'Punjab',
    },
    description: '',
    technicalSpecs: '',
    applications: [],
    ...overrides,
  };
}

export const DEMO_LISTINGS: AssistantListing[] = [
  mockListing({
    id: 'agri-x1',
    name: 'Garud AgriSpray X1',
    category: 'AGRICULTURE_DRONE',
    priceInr: '285000',
    description:
      '16L agriculture spraying platform for Punjab fleets. DGCA-friendly documentation support.',
    technicalSpecs: 'Tank: 16L | Endurance: 18 min | Payload class: agri spray',
    applications: ['Agriculture Spraying'],
  }),
  mockListing({
    id: 'agri-lite',
    name: 'Garud AgriSpray Lite S',
    category: 'AGRICULTURE_DRONE',
    priceOnRequest: true,
    priceInr: null,
    description: 'Entry-level spray drone — price on request, MOQ 3.',
    minOrderQuantity: 3,
  }),
  mockListing({
    id: 'survey-pro',
    name: 'SurveyMapper Pro 40',
    category: 'SURVEY_MAPPING_DRONE',
    priceOnRequest: true,
    description: 'PPK-ready mapping drone for construction survey.',
    technicalSpecs: 'PPK/RTK ready | Endurance: 40 min',
    applications: ['Topographic Survey & Mapping'],
  }),
  mockListing({
    id: 'survey-lite',
    name: 'SurveyMapper Lite 25',
    category: 'SURVEY_MAPPING_DRONE',
    priceInr: '425000',
    description: 'Mapping drone for quick checkout.',
  }),
  mockListing({
    id: 'training-1',
    name: 'DGCA Remote Pilot Course',
    category: 'TRAINING',
    listingType: 'SERVICE',
    priceInr: '45000',
    description: 'DGCA-aligned remote pilot training program.',
  }),
];
