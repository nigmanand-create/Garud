import type { PartnershipRequestStatus, PartnershipRequestType } from '@/lib/api/partnerships';
import type {
  AccountType,
  CatalogCategory,
  EnquiryIntent,
  LeadStatus,
  ListingType,
  RfqInviteStatus,
} from '@/lib/api/types';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  MANUFACTURER: 'Manufacturer',
  OEM: 'OEM',
  INTERNATIONAL_COMPANY: 'International company',
  DISTRIBUTOR: 'Distributor',
  DEALER: 'Dealer',
  SERVICE_PROVIDER: 'Service provider',
  TRAINING_INSTITUTE: 'Training institute',
  TECHNOLOGY_COMPANY: 'Technology company',
  BUYER_ENTERPRISE: 'Buyer / enterprise',
  GOVERNMENT_PSU: 'Government / PSU',
};

export const PARTNER_ACCOUNT_TYPES: AccountType[] = [
  'MANUFACTURER',
  'OEM',
  'INTERNATIONAL_COMPANY',
  'DISTRIBUTOR',
  'DEALER',
  'SERVICE_PROVIDER',
  'TRAINING_INSTITUTE',
  'TECHNOLOGY_COMPANY',
];

export const BUYER_ENTERPRISE_ACCOUNT_TYPES: AccountType[] = ['BUYER_ENTERPRISE'];

export const GOVERNMENT_ACCOUNT_TYPES: AccountType[] = ['GOVERNMENT_PSU'];

export const BUYER_ACCOUNT_TYPES: AccountType[] = [
  ...BUYER_ENTERPRISE_ACCOUNT_TYPES,
  ...GOVERNMENT_ACCOUNT_TYPES,
];

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  PRODUCT: 'Product',
  SERVICE: 'Service',
};

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  AGRICULTURE_DRONE: 'Agriculture drone',
  SURVEY_MAPPING_DRONE: 'Survey & mapping',
  INDUSTRIAL_ENTERPRISE_DRONE: 'Industrial / enterprise',
  CAMERA_DRONE: 'Camera drone',
  COMPONENT: 'Component',
  ACCESSORY: 'Accessory',
  PAYLOAD: 'Payload',
  REPAIR_MAINTENANCE: 'Repair & maintenance',
  TRAINING: 'Training',
  CONSULTANCY: 'Consultancy',
  OTHER: 'Other',
};

export const RFQ_INVITE_STATUS_LABELS: Record<RfqInviteStatus, string> = {
  INVITED: 'Awaiting your quote',
  QUOTED: 'Quote submitted',
  DECLINED: 'Declined',
};

export function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export function formatPrice(
  priceOnRequest: boolean,
  priceInr?: string | number | null,
): string {
  if (priceOnRequest) return 'Price on request';
  if (priceInr == null) return '—';
  const n = typeof priceInr === 'string' ? parseFloat(priceInr) : priceInr;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export const ENQUIRY_INTENT_LABELS: Record<EnquiryIntent, string> = {
  GENERAL: 'General',
  PRODUCT: 'Product / supplier',
  DEMO: 'Demo request',
  DISTRIBUTOR: 'Distributor',
  PARTNER: 'Partner contact',
  SERVICE: 'Service vertical',
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  WON: 'Won',
  LOST: 'Lost',
};

export const PARTNERSHIP_TYPE_LABELS: Record<PartnershipRequestType, string> = {
  DISTRIBUTORSHIP: 'Distributorship',
  DEALERSHIP: 'Dealership',
  OEM_PARTNERSHIP: 'OEM partnership',
  TECHNOLOGY_INTEGRATION: 'Technology integration',
  SERVICE_PARTNERSHIP: 'Service partnership',
  TRAINING_PARTNERSHIP: 'Training partnership',
  OTHER: 'Other',
};

export const PARTNERSHIP_STATUS_LABELS: Record<PartnershipRequestStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  WITHDRAWN: 'Withdrawn',
};

/** Platform service verticals (from /enquiry?service=) mapped to the catalog categories that serve them. */
export const SERVICE_VERTICALS: { key: string; label: string; categories: CatalogCategory[] }[] = [
  { key: 'compliance', label: 'Compliance & regulatory', categories: ['CONSULTANCY'] },
  { key: 'repair', label: 'Repair & maintenance', categories: ['REPAIR_MAINTENANCE'] },
  { key: 'training', label: 'Training & licensing', categories: ['TRAINING'] },
  { key: 'finance', label: 'Finance & leasing', categories: ['CONSULTANCY', 'OTHER'] },
  { key: 'recycling', label: 'Recycling & disposal', categories: ['OTHER'] },
];
