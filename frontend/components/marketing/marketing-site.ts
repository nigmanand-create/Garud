export const LOGO_URL =
  'https://pzcredorra.b-cdn.net/uploads/tenant_8243/media/6a8fcd707a769-untitled-29-july-2026-at-125251-23.png';

export const CONTACT_EMAIL = 'chandraghanshyamdrone@gmail.com';
export const CONTACT_PHONE = '9935760540';

export const SERVICES_MEGA_COL1 = [
  { href: '/services', icon: 'bi-grid-fill', label: 'All 8 Ecosystem Services' },
  { href: '/services#training', icon: 'bi-mortarboard-fill', label: 'Drone Pilot & Tech Training' },
  { href: '/services#compliance', icon: 'bi-shield-check', label: 'DGCA & Regulatory Compliance' },
  { href: '/services#repair', icon: 'bi-tools', label: 'Repair, AMC & Maintenance' },
  { href: '/services#professional', icon: 'bi-briefcase-fill', label: 'Survey & Professional Services' },
];

export const SERVICES_MEGA_COL2 = [
  { href: '/services#finance', icon: 'bi-cash-coin', label: 'Drone Finance & Insurance' },
  { href: '/services#government', icon: 'bi-building-fill', label: 'Government Projects & Schemes' },
  { href: '/services#recycling', icon: 'bi-recycle', label: 'Scrap, Buyback & Recycling' },
  { href: '/marketplace', icon: 'bi-shop', label: 'Drone B2B Marketplace' },
];

export const PARTNERS_MEGA_COL1 = [
  { href: '/b2b-partners', icon: 'bi-globe2', label: 'B2B Partner Ecosystem Overview' },
  { href: '/b2b-partners#manufacturers', icon: 'bi-cpu-fill', label: 'Drone Manufacturers & OEMs' },
  { href: '/b2b-partners#international', icon: 'bi-airplane-engines', label: 'International Companies' },
  { href: '/b2b-partners#dealers', icon: 'bi-shop-window', label: 'Distributors & Dealers' },
];

export const PARTNERS_MEGA_COL2 = [
  { href: '/b2b-partners#services', icon: 'bi-tools', label: 'Service & Maintenance Providers' },
  { href: '/b2b-partners#training', icon: 'bi-mortarboard', label: 'Training Institutes & Academies' },
  { href: '/b2b-partners#technology', icon: 'bi-diagram-3-fill', label: 'Technology & Project Partners' },
  { href: '/auth/register?type=partner', icon: 'bi-patch-check-fill', label: 'Register as B2B Partner →' },
];

export const MARKETPLACE_LINKS = [
  { href: '/marketplace', icon: 'bi-shop', label: 'Browse all' },
  { href: '/marketplace?section=drones', icon: 'bi-airplane-fill', label: 'Drones' },
  {
    href: '/marketplace?section=accessories',
    icon: 'bi-box-seam-fill',
    label: 'Accessories',
  },
  {
    href: '/marketplace?section=components',
    icon: 'bi-cpu-fill',
    label: 'Components & payloads',
  },
  {
    href: '/marketplace?section=courses',
    icon: 'bi-mortarboard-fill',
    label: 'Courses & training',
  },
  {
    href: '/marketplace?section=services',
    icon: 'bi-tools',
    label: 'Services',
  },
];

export const MOBILE_SERVICES_LINKS = [...SERVICES_MEGA_COL1, ...SERVICES_MEGA_COL2];

export const MOBILE_PARTNERS_LINKS = [...PARTNERS_MEGA_COL1, ...PARTNERS_MEGA_COL2];
