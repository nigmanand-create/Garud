import {
  CatalogCategory,
  ListingReviewStatus,
  ListingType,
} from '@prisma/client';

/** GarudHub marketplace–inspired demo catalog (https://garudhub.com/drone-marketplace). */
export const GARUDHUB_CDN_LOGO =
  'https://pzcredorra.b-cdn.net/uploads/tenant_8243/media/6a8fcd707a769-untitled-29-july-2026-at-125251-23.png';

export type MarketplaceDroneSeed = {
  name: string;
  sku: string;
  listingType: ListingType;
  category: CatalogCategory;
  brand?: string;
  priceOnRequest: boolean;
  priceInr: number | null;
  minOrderQuantity: number;
  description: string;
  technicalSpecs: string;
  applications: string[];
  primaryImageUrl: string;
  galleryImageUrls?: string[];
  featuredOnMarketplace?: boolean;
  isPublished?: boolean;
  reviewStatus?: ListingReviewStatus;
};

export const MARKETPLACE_DRONE_SEEDS: MarketplaceDroneSeed[] = [
  {
    name: 'Commercial Ops Drone',
    sku: 'GH-COMM-OPS',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.INDUSTRIAL_ENTERPRISE_DRONE,
    brand: 'GarudHub Verified',
    priceOnRequest: false,
    priceInr: 85000,
    minOrderQuantity: 1,
    description:
      'Versatile commercial inspection platform for site surveys, asset monitoring, and light payload ops. Inspired by GarudHub marketplace “Commercial Ops” tier — fixed list price from ₹85,000 for cart checkout and side-by-side spec compare.',
    technicalSpecs:
      'Flight time: 35 min | Camera: 4K stabilized | Range: 7 km | Max payload: 1.2 kg | Wind tolerance: 10 m/s | Warranty: 1 year (seller disclosed)',
    applications: ['Industrial & Infrastructure Inspection', 'Security & Surveillance'],
    primaryImageUrl: GARUDHUB_CDN_LOGO,
    featuredOnMarketplace: true,
  },
  {
    name: 'AgriSpray Pro',
    sku: 'GH-AGRI-PRO',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.AGRICULTURE_DRONE,
    brand: 'GarudHub Verified',
    priceOnRequest: false,
    priceInr: 425000,
    minOrderQuantity: 1,
    description:
      '20 L agriculture spray drone for pesticide and crop protection — matches GarudHub marketplace AgriSpray positioning (₹4,25,000 onwards). RTK-ready option via RFQ; ideal Punjab/Haryana contract spraying demos.',
    technicalSpecs:
      'Tank: 20 L | Flight time: 25 min (full tank) | Spray width: 6 m | Range: 3 km | RTK terrain follow (optional) | Warranty: 1 year',
    applications: ['Agriculture Spraying'],
    primaryImageUrl: GARUDHUB_CDN_LOGO,
    featuredOnMarketplace: true,
  },
  {
    name: 'SurveyMax Mapper',
    sku: 'GH-SURV-MAX',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.SURVEY_MAPPING_DRONE,
    brand: 'GarudHub Verified',
    priceOnRequest: false,
    priceInr: 310000,
    minOrderQuantity: 1,
    description:
      'Survey & mapping UAV with RTK GPS and long endurance for construction photogrammetry and mining volumetrics — GarudHub compare-table benchmark (₹3,10,000+).',
    technicalSpecs:
      'Flight time: 45 min | RTK GPS | Range: 10 km | Camera: survey-grade RGB | PPK workflow supported | Warranty: 2 years',
    applications: [
      'Topographic Survey & Mapping',
      'Mining & Volumetric Estimation',
    ],
    primaryImageUrl:
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80',
    featuredOnMarketplace: true,
  },
  {
    name: 'AeroShot Cine',
    sku: 'GH-CINE-AERO',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.CAMERA_DRONE,
    brand: 'GarudHub Verified',
    priceOnRequest: false,
    priceInr: 145000,
    minOrderQuantity: 1,
    description:
      '6K gimbal cinema drone for film, wedding, and broadcast crews — GarudHub marketplace camera category (₹1,45,000 onwards). DGCA remote pilot rules apply.',
    technicalSpecs:
      'Video: 6K gimbal | Flight time: 30 min | Range: 8 km | Obstacle sensing | Max speed: 21 m/s | Warranty: 1 year',
    applications: [],
    primaryImageUrl:
      'https://images.unsplash.com/photo-1508610048650-a6472333995a?w=800&q=80',
  },
  {
    name: 'Enterprise Fleet X',
    sku: 'GH-ENT-FLEET',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.INDUSTRIAL_ENTERPRISE_DRONE,
    brand: 'GarudHub Verified',
    priceOnRequest: false,
    priceInr: 680000,
    minOrderQuantity: 1,
    description:
      'Enterprise fleet platform with thermal payload mount and extended range for PSU and industrial ops — GarudHub enterprise row (₹6,80,000+).',
    technicalSpecs:
      'Flight time: 50 min | Payload: thermal + RGB mount | Range: 15 km | Redundant propulsion option | Warranty: 2 years',
    applications: [
      'Industrial & Infrastructure Inspection',
      'Powerline & Solar Panel Monitoring',
    ],
    primaryImageUrl:
      'https://images.unsplash.com/photo-1524443164165-7d786564b350?w=800&q=80',
    featuredOnMarketplace: true,
  },
  {
    name: 'SecureWatch S450',
    sku: 'GH-SURV-S450',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.INDUSTRIAL_ENTERPRISE_DRONE,
    brand: 'GarudHub Verified',
    priceOnRequest: true,
    priceInr: null,
    minOrderQuantity: 2,
    description:
      'Surveillance & security patrol drone with EO/IR gimbal and encrypted datalink — price on request for perimeter and event security fleets (MOQ 2).',
    technicalSpecs:
      'Endurance: 38 min | EO/IR dual sensor | Encrypted link | Night ops capable | DGCA compliance pack via RFQ',
    applications: ['Security & Surveillance'],
    primaryImageUrl:
      'https://images.unsplash.com/photo-1524443164165-7d786564b350?w=800&q=80',
  },
  {
    name: 'Garud AgriSpray X1',
    sku: 'GD-AGRI-X1',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.AGRICULTURE_DRONE,
    brand: 'Demo Drone Manufacturing',
    priceOnRequest: false,
    priceInr: 285000,
    minOrderQuantity: 1,
    description:
      'Fixed-price agriculture spray drone for pesticide and crop protection. 16L tank, RTK terrain follow — primary checkout QA listing (staging smoke GD-AGRI-X1).',
    technicalSpecs:
      'Tank: 16 L | Endurance: 22 min (full tank) | Spray width: 4–6 m | RTK GPS + terrain follow | DGCA model ref: GD-AGRI-X1',
    applications: ['Agriculture Spraying'],
    primaryImageUrl: GARUDHUB_CDN_LOGO,
    featuredOnMarketplace: true,
  },
  {
    name: 'SurveyMapper Lite 25',
    sku: 'GD-SURV-25',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.SURVEY_MAPPING_DRONE,
    brand: 'Demo Drone Manufacturing',
    priceOnRequest: false,
    priceInr: 425000,
    minOrderQuantity: 1,
    description:
      'Mid-range photogrammetry drone — 25 min endurance, fixed ₹4,25,000 for construction survey demos.',
    technicalSpecs:
      'Endurance: 25 min | Camera: 20 MP RGB | PPK supported (rover optional) | Mapping accuracy: 2–5 cm GSD @ 100 m AGL',
    applications: ['Topographic Survey & Mapping'],
    primaryImageUrl:
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80',
  },
  {
    name: 'Garud NavCore FC-32 Flight Controller',
    sku: 'GD-COMP-FC32',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.COMPONENT,
    brand: 'Demo Drone Manufacturing',
    priceOnRequest: false,
    priceInr: 12800,
    minOrderQuantity: 5,
    description:
      'Redundant IMU flight controller for custom multirotor builds — MOQ 5 for OEM batch orders.',
    technicalSpecs:
      'Dual IMU | CAN ESC | ArduPilot-compatible | Weight: 38 g | Temp: -10°C to 50°C',
    applications: ['Topographic Survey & Mapping', 'Agriculture Spraying'],
    primaryImageUrl:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  },
  {
    name: 'Garud PowerPack 88Wh Battery Kit',
    sku: 'GD-ACC-BATT88',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.ACCESSORY,
    brand: 'Demo Drone Manufacturing',
    priceOnRequest: false,
    priceInr: 18500,
    minOrderQuantity: 2,
    description:
      'Smart 88Wh Li-ion battery kit with charge hub — B2B accessory add-on for survey and agri fleets.',
    technicalSpecs:
      'Capacity: 88 Wh | Charge time: 45 min (hub) | Cycle rating: 300+ | Includes fire-safe case',
    applications: ['Agriculture Spraying', 'Topographic Survey & Mapping'],
    primaryImageUrl:
      'https://images.unsplash.com/photo-1609091839311-9a942d692196?w=800&q=80',
  },
  {
    name: 'Garud MultiSpec NDVI Payload',
    sku: 'GD-PAY-MULTI',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.PAYLOAD,
    brand: 'Demo Drone Manufacturing',
    priceOnRequest: true,
    priceInr: null,
    minOrderQuantity: 1,
    description:
      'Multispectral NDVI payload for crop health and precision farming — radiometric calibration quoted per RFQ.',
    technicalSpecs:
      'Bands: RGB + Red Edge + NIR | Weight: 420 g | PPK-sync capable | Mount: standard payload rail',
    applications: ['Agriculture Spraying'],
    primaryImageUrl:
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
  },
  {
    name: 'Garud Pilot Academy — DGCA Category Training',
    sku: 'GD-SVC-TRN-01',
    listingType: ListingType.SERVICE,
    category: CatalogCategory.TRAINING,
    brand: 'Demo Drone Manufacturing',
    priceOnRequest: false,
    priceInr: 45000,
    minOrderQuantity: 1,
    description:
      'DGCA-aligned remote pilot category training — 5-day Bengaluru cohort with simulator hours.',
    technicalSpecs:
      'Duration: 5 days (40 hrs) | Topics: Drone Rules 2021, NPNT basics, airspace | Batch: 8–20 seats',
    applications: ['Agriculture Spraying', 'Topographic Survey & Mapping'],
    primaryImageUrl:
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
  },
  {
    name: 'Garud Care Annual Maintenance Contract',
    sku: 'GD-SVC-RM-01',
    listingType: ListingType.SERVICE,
    category: CatalogCategory.REPAIR_MAINTENANCE,
    brand: 'Demo Drone Manufacturing',
    priceOnRequest: true,
    priceInr: null,
    minOrderQuantity: 1,
    description: 'Annual maintenance contract for enterprise agri, survey, and industrial fleets.',
    technicalSpecs:
      'SLA: 48 hr on-site (metro) | Coverage: airframe, propulsion, payload mount | Spares: tiered BOM in RFQ',
    applications: ['Industrial & Infrastructure Inspection', 'Agriculture Spraying'],
    primaryImageUrl:
      'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80',
  },
  {
    name: 'Garud ProtoFrame X (Draft)',
    sku: 'GD-DRAFT-PROT',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.OTHER,
    brand: 'Demo Drone Manufacturing',
    priceOnRequest: false,
    priceInr: 99000,
    minOrderQuantity: 1,
    description: 'Work-in-progress listing for partner catalog editor and save-draft flows.',
    technicalSpecs: '',
    applications: [],
    primaryImageUrl: GARUDHUB_CDN_LOGO,
    isPublished: false,
    reviewStatus: ListingReviewStatus.DRAFT,
  },
  {
    name: 'Garud ThermalInspect T2 (Pending Review)',
    sku: 'GD-PEND-REV',
    listingType: ListingType.PRODUCT,
    category: CatalogCategory.INDUSTRIAL_ENTERPRISE_DRONE,
    brand: 'Demo Drone Manufacturing',
    priceOnRequest: false,
    priceInr: 620000,
    minOrderQuantity: 1,
    description:
      'Submitted for platform admin approval — use admin moderation UI to approve or reject.',
    technicalSpecs:
      'Thermal payload placeholder | Endurance: TBD | Pending moderation',
    applications: ['Industrial & Infrastructure Inspection'],
    primaryImageUrl:
      'https://images.unsplash.com/photo-1524443164165-7d786564b350?w=800&q=80',
    isPublished: false,
    reviewStatus: ListingReviewStatus.PENDING_REVIEW,
  },
];
