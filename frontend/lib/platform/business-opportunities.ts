/**
 * Spec §1.4 marketplace "BUSINESS OPPORTUNITIES" block:
 * [DISTRIBUTOR] [DEALERSHIP] [PROJECTS] [PARTNERSHIPS]
 * Each card routes into an existing first-party flow (enquiry → lead, or partnership request).
 */
export type BusinessOpportunity = {
  id: 'distributor' | 'dealership' | 'projects' | 'partnerships';
  icon: string;
  title: string;
  description: string;
  cta: string;
  href: string;
};

export const BUSINESS_OPPORTUNITIES: BusinessOpportunity[] = [
  {
    id: 'distributor',
    icon: 'ph ph-fill ph-truck',
    title: 'Distributor',
    description:
      'Take on regional distribution for OEM and international drone brands entering India.',
    cta: 'Become a distributor',
    href: '/marketplace/distributor?type=DISTRIBUTOR',
  },
  {
    id: 'dealership',
    icon: 'ph ph-fill ph-storefront',
    title: 'Dealership',
    description:
      'Open a dealership or reseller point for drones, accessories and spares in your city.',
    cta: 'Apply for dealership',
    href: '/marketplace/distributor?type=DEALER',
  },
  {
    id: 'projects',
    icon: 'ph ph-fill ph-briefcase',
    title: 'Projects',
    description:
      'Find survey, agriculture, infrastructure and government drone projects to bid for.',
    cta: 'Explore projects',
    href: `/enquiry?intent=PARTNER&subject=${encodeURIComponent('Project opportunities')}`,
  },
  {
    id: 'partnerships',
    icon: 'ph ph-fill ph-handshake',
    title: 'Partnerships',
    description:
      'Technology, service and training tie-ups across the Indian drone ecosystem.',
    cta: 'Discuss a partnership',
    href: `/enquiry?intent=PARTNER&subject=${encodeURIComponent('Partnership opportunity')}`,
  },
];

export type RfqStep = { label: string; description: string };

/** Spec §1.4 "HOW RFQ WORKS": requirement → verified vendors → quotations → comparison → buyer connection. */
export const RFQ_STEPS: RfqStep[] = [
  { label: 'Requirement', description: 'Post what you need' },
  { label: 'Verified vendors', description: 'Matched partners are invited' },
  { label: 'Quotations', description: 'Receive multiple bids' },
  { label: 'Comparison', description: 'Compare price, specs, lead time' },
  { label: 'Buyer connection', description: 'Award and order, or contact supplier' },
];
