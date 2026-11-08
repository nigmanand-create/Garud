import {
  HEADER_LOGIN_CTA,
  HEADER_REGISTER_PARTNER_CTA,
} from '@/lib/platform/header-nav';

/** Spec home page blocks (DECODE_JWT_SPEC PAGE 1 — HOME). Hrefs must resolve to React routes. */

export const HOME_HERO_IMAGE =
  'https://i.ibb.co/tphSghzT/image-3.webp';

export const HOME_CONTENT = {
  hero: {
    brandName: 'GarudHub',
    eyebrow: "INDIA'S B2B DRONE ECOSYSTEM",
    title: "India's B2B Drone Ecosystem Platform",
    lead: 'Connect global drone technology with India — marketplace, RFQs, training, compliance and projects in one verified B2B hub.',
    primaryCta: { ...HEADER_REGISTER_PARTNER_CTA },
    secondaryCta: { href: '/services', label: 'Explore Services' },
    signInCta: { ...HEADER_LOGIN_CTA },
    imageAlt: 'Enterprise drone solutions across industries in India',
    trustChips: [
      { iconClass: 'ph ph-fill ph-shield-check', label: 'Verified B2B partners' },
      { iconClass: 'ph ph-fill ph-globe-hemisphere-west', label: 'Global ↔ India bridge' },
      { iconClass: 'ph ph-fill ph-map-pin', label: 'Pan-India ecosystem' },
    ],
    statItems: [
      { iconClass: 'ph ph-fill ph-grid-four', bold: '8', label: 'Core services' },
      { iconClass: 'ph ph-fill ph-handshake', bold: '8', label: 'Partner types' },
      { iconClass: 'ph ph-fill ph-buildings', bold: '9', label: 'Industries served' },
      { iconClass: 'ph ph-fill ph-storefront', bold: 'B2B', label: 'Marketplace & RFQs' },
    ],
  },
  whoWeAre:
    "GarudHub is India's B2B Drone Ecosystem Platform — connecting Indian and international companies with buyers, distributors, dealers, service providers, training organizations, enterprises and government opportunities.",
  ecosystemFlow: ['Manufacturer', 'GarudHub', 'Distributor', 'Dealer', 'Buyer'],
  ecosystemSupport: ['Service', 'Training', 'Projects'],
  services: [
    { number: '01', title: 'Marketplace', icon: 'bi-shop', href: '/marketplace', desc: 'Drones, components, accessories and services from verified sellers.' },
    { number: '02', title: 'Training', icon: 'bi-mortarboard-fill', href: '/services/training', desc: 'DGCA remote pilot and technician training institutes.' },
    { number: '03', title: 'Compliance', icon: 'bi-shield-check', href: '/services/compliance', desc: 'Registration, documentation and regulatory support.' },
    { number: '04', title: 'Repair', icon: 'bi-tools', href: '/services/repair', desc: 'Repair, AMC, inspection and spare parts network.' },
    { number: '05', title: 'Professional Services', icon: 'bi-briefcase-fill', href: '/services/professional', desc: 'Survey, mapping, agriculture and consultancy services.' },
    { number: '06', title: 'Finance', icon: 'bi-cash-coin', href: '/services/finance', desc: 'Financing, EMI, insurance and loan assistance.' },
    { number: '07', title: 'Projects', icon: 'bi-building-fill', href: '/services/government', desc: 'Government tenders, schemes and subsidies.' },
    { number: '08', title: 'Recycling', icon: 'bi-recycle', href: '/services/recycling', desc: 'Scrap, buyback and responsible drone recycling.' },
  ],
  /** `type` maps to `/auth/register?type=` (AccountType enum or `partner`). */
  whoCanJoin: [
    { type: 'OEM', label: 'OEM', icon: 'bi-cpu-fill' },
    { type: 'MANUFACTURER', label: 'Manufacturer', icon: 'bi-gear-wide-connected' },
    { type: 'INTERNATIONAL_COMPANY', label: 'International company', icon: 'bi-airplane-engines' },
    { type: 'DISTRIBUTOR', label: 'Distributor', icon: 'bi-truck' },
    { type: 'DEALER', label: 'Dealer', icon: 'bi-shop-window' },
    { type: 'SERVICE_PROVIDER', label: 'Service provider', icon: 'bi-tools' },
    { type: 'TRAINING_INSTITUTE', label: 'Training institute', icon: 'bi-mortarboard' },
    { type: 'TECHNOLOGY_COMPANY', label: 'Technology company', icon: 'bi-diagram-3-fill' },
  ],
  why: [
    { title: 'Indian Market Access', desc: 'Reach verified buyers across states, enterprises and government.' },
    { title: 'Business Leads', desc: 'Receive enquiries and RFQs routed to your partner dashboard.' },
    { title: 'Distribution Network', desc: 'Find distributors and dealers for pan-India coverage.' },
    { title: 'Project Opportunities', desc: 'Surface to tenders, schemes and enterprise projects.' },
  ],
  howItWorks: ['Register', 'Verify', 'Profile', 'List', 'Get leads'],
  industries: [
    'Agriculture',
    'Infrastructure',
    'Mining',
    'Power',
    'Construction',
    'Survey',
    'Defence',
    'Logistics',
    'Government',
  ],
} as const;
