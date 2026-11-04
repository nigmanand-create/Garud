/**
 * Phase 8 vertical journeys: service requests (C8), training, gov / tenders.
 * Pure helpers (labels, intake field definitions, formatting) so they can be unit-tested.
 */

export type ServiceRequestCategory =
  | 'REPAIR_AMC'
  | 'COMPLIANCE'
  | 'PROFESSIONAL'
  | 'FINANCE_INSURANCE'
  | 'SCRAP_RECYCLING'
  | 'OTHER';

export type ServiceRequestStatus =
  | 'SUBMITTED'
  | 'MATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export const SERVICE_REQUEST_CATEGORY_LABELS: Record<ServiceRequestCategory, string> = {
  REPAIR_AMC: 'Repair & AMC',
  COMPLIANCE: 'DGCA & compliance',
  PROFESSIONAL: 'Professional drone services',
  FINANCE_INSURANCE: 'Finance & insurance',
  SCRAP_RECYCLING: 'Scrap & recycling',
  OTHER: 'Other service',
};

export const SERVICE_REQUEST_CATEGORIES = Object.keys(
  SERVICE_REQUEST_CATEGORY_LABELS,
) as ServiceRequestCategory[];

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  SUBMITTED: 'Submitted',
  MATCHED: 'Matched',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const SERVICE_REQUEST_STATUSES = Object.keys(
  SERVICE_REQUEST_STATUS_LABELS,
) as ServiceRequestStatus[];

/** Requester-facing progress steps (Submit → Match → Connect → Service); cancelled is separate. */
export const SERVICE_REQUEST_STEPS: ServiceRequestStatus[] = [
  'SUBMITTED',
  'MATCHED',
  'IN_PROGRESS',
  'COMPLETED',
];

/** Index of `status` in the progress steps; -1 for CANCELLED. */
export function statusStepIndex(status: ServiceRequestStatus): number {
  return SERVICE_REQUEST_STEPS.indexOf(status);
}

export function canRequesterCancel(status: ServiceRequestStatus): boolean {
  return status !== 'COMPLETED' && status !== 'CANCELLED';
}

/** Phase 1 `?service=` keys (URL / EnquiryForm) → request category. */
export const SERVICE_KEY_TO_CATEGORY: Record<string, ServiceRequestCategory> = {
  repair: 'REPAIR_AMC',
  compliance: 'COMPLIANCE',
  professional: 'PROFESSIONAL',
  finance: 'FINANCE_INSURANCE',
  recycling: 'SCRAP_RECYCLING',
  scrap: 'SCRAP_RECYCLING',
  other: 'OTHER',
};

export function categoryForServiceKey(
  key?: string | null,
): ServiceRequestCategory | null {
  if (!key) return null;
  return SERVICE_KEY_TO_CATEGORY[key.trim().toLowerCase()] ?? null;
}

// --- Vertical-specific intake forms -------------------------------------------

export type IntakeField = {
  /** Flat key sent in `details` (letters/digits/underscore, matches backend). */
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  placeholder?: string;
  required?: boolean;
};

export type VerticalConfig = {
  category: ServiceRequestCategory;
  label: string;
  intro: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  fields: IntakeField[];
};

export const SERVICE_VERTICAL_CONFIGS: VerticalConfig[] = [
  {
    category: 'REPAIR_AMC',
    label: SERVICE_REQUEST_CATEGORY_LABELS.REPAIR_AMC,
    intro:
      'Describe the issue and where the drone is. Verified repair partners covering your state are notified.',
    titlePlaceholder: 'e.g. Crash repair for agri spray drone',
    descriptionPlaceholder: 'What happened, symptoms, warranty status, urgency…',
    fields: [
      { name: 'droneModel', label: 'Drone make / model', type: 'text', placeholder: 'e.g. DJI Agras T30', required: true },
      {
        name: 'issueType',
        label: 'Issue',
        type: 'select',
        options: ['Crash damage', 'Motor / ESC', 'Gimbal / camera', 'Battery', 'Flight controller', 'Periodic service / AMC'],
        required: true,
      },
      { name: 'fleetSize', label: 'Number of drones', type: 'number', placeholder: '1' },
      {
        name: 'serviceMode',
        label: 'Service mode',
        type: 'select',
        options: ['Pickup & return', 'On-site visit', 'I will drop off'],
      },
    ],
  },
  {
    category: 'COMPLIANCE',
    label: SERVICE_REQUEST_CATEGORY_LABELS.COMPLIANCE,
    intro:
      'Tell us what approval or filing you need. Verified compliance consultants will respond.',
    titlePlaceholder: 'e.g. UIN registration for 3 drones',
    descriptionPlaceholder: 'Entity type, drone details, deadlines…',
    fields: [
      {
        name: 'complianceNeed',
        label: 'What do you need?',
        type: 'select',
        options: ['UIN registration', 'Type certification', 'Digital Sky / permissions', 'Import clearance', 'Other regulatory advice'],
        required: true,
      },
      { name: 'droneModel', label: 'Drone make / model', type: 'text' },
    ],
  },
  {
    category: 'PROFESSIONAL',
    label: SERVICE_REQUEST_CATEGORY_LABELS.PROFESSIONAL,
    intro:
      'Share the job scope and location. Verified service operators will pick it up.',
    titlePlaceholder: 'e.g. Survey of 200 acres for land records',
    descriptionPlaceholder: 'Scope, deliverables, site access…',
    fields: [
      {
        name: 'serviceType',
        label: 'Service type',
        type: 'select',
        options: ['Survey & mapping', 'Agri spraying', 'Thermal inspection', 'Mining volumetrics', 'Other'],
        required: true,
      },
      { name: 'areaAcres', label: 'Approx. area (acres)', type: 'number' },
      { name: 'timeline', label: 'Timeline', type: 'text', placeholder: 'e.g. within 2 weeks' },
    ],
  },
  {
    category: 'FINANCE_INSURANCE',
    label: SERVICE_REQUEST_CATEGORY_LABELS.FINANCE_INSURANCE,
    intro:
      'Share what you want to finance or insure. Verified finance and insurance partners will reach out.',
    titlePlaceholder: 'e.g. EMI for an agriculture drone',
    descriptionPlaceholder: 'Purpose, tenure preference, existing finance…',
    fields: [
      {
        name: 'financeType',
        label: 'Looking for',
        type: 'select',
        options: ['Drone loan / EMI', 'Insurance', 'Leasing', 'Subsidy-linked finance'],
        required: true,
      },
      { name: 'loanAmountInr', label: 'Amount needed (₹)', type: 'number' },
      { name: 'droneModel', label: 'Drone to finance / insure', type: 'text' },
      {
        name: 'applicantType',
        label: 'Applicant',
        type: 'select',
        options: ['Individual / farmer', 'FPO / SHG', 'Company', 'Startup'],
      },
    ],
  },
  {
    category: 'SCRAP_RECYCLING',
    label: SERVICE_REQUEST_CATEGORY_LABELS.SCRAP_RECYCLING,
    intro:
      'Tell us what you want to sell or dispose of. Recycling partners will evaluate and make an offer.',
    titlePlaceholder: 'e.g. Buyback of 2 crashed survey drones',
    descriptionPlaceholder: 'Condition, accessories included, pickup location…',
    fields: [
      { name: 'droneModel', label: 'Drone make / model', type: 'text', required: true },
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        options: ['Working', 'Crash damaged', 'Not powering on', 'Parts only'],
        required: true,
      },
      { name: 'quantity', label: 'Quantity (units)', type: 'number', placeholder: '1' },
      { name: 'batteriesIncluded', label: 'Batteries included?', type: 'select', options: ['Yes', 'No'] },
      { name: 'purchaseYear', label: 'Year of purchase', type: 'number' },
    ],
  },
  {
    category: 'OTHER',
    label: SERVICE_REQUEST_CATEGORY_LABELS.OTHER,
    intro: 'Describe the service you need and the GarudHub team will route it.',
    titlePlaceholder: 'Short summary of what you need',
    descriptionPlaceholder: 'Describe the requirement…',
    fields: [],
  },
];

const CONFIG_BY_CATEGORY = Object.fromEntries(
  SERVICE_VERTICAL_CONFIGS.map((c) => [c.category, c]),
) as Record<ServiceRequestCategory, VerticalConfig>;

/** Accepts a category enum value or a Phase 1 `service` key; falls back to REPAIR_AMC. */
export function resolveVerticalConfig(input?: string | null): VerticalConfig {
  if (input) {
    const upper = input.trim().toUpperCase();
    if (upper in CONFIG_BY_CATEGORY) {
      return CONFIG_BY_CATEGORY[upper as ServiceRequestCategory];
    }
    const mapped = categoryForServiceKey(input);
    if (mapped) return CONFIG_BY_CATEGORY[mapped];
  }
  return CONFIG_BY_CATEGORY.REPAIR_AMC;
}

/** Labels of required fields that are still empty. */
export function missingRequiredFields(
  config: VerticalConfig,
  values: Record<string, string>,
): string[] {
  return config.fields
    .filter((f) => f.required && !values[f.name]?.trim())
    .map((f) => f.label);
}

/** Form values → flat `details` payload (drops empties, coerces numbers, ignores unknown keys). */
export function buildRequestDetails(
  config: VerticalConfig,
  values: Record<string, string>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const f of config.fields) {
    const raw = values[f.name]?.trim();
    if (!raw) continue;
    if (f.type === 'number') {
      const n = Number(raw);
      if (Number.isFinite(n)) out[f.name] = n;
    } else {
      out[f.name] = raw;
    }
  }
  return out;
}

/** "droneModel" → "Drone model". */
export function formatDetailKey(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

// --- Training -----------------------------------------------------------------

export type TrainingCourseType =
  | 'REMOTE_PILOT'
  | 'TECHNICIAN'
  | 'SPECIALIZED'
  | 'CORPORATE'
  | 'OTHER';
export type TrainingMode = 'ONSITE' | 'ONLINE' | 'HYBRID';
export type TrainingBatchStatus = 'OPEN' | 'FULL' | 'CLOSED' | 'COMPLETED';

export const TRAINING_COURSE_TYPE_LABELS: Record<TrainingCourseType, string> = {
  REMOTE_PILOT: 'Remote pilot (RPC)',
  TECHNICIAN: 'Technician',
  SPECIALIZED: 'Specialized',
  CORPORATE: 'Corporate',
  OTHER: 'Other',
};

export const TRAINING_MODE_LABELS: Record<TrainingMode, string> = {
  ONSITE: 'On-site',
  ONLINE: 'Online',
  HYBRID: 'Hybrid',
};

export const TRAINING_BATCH_STATUS_LABELS: Record<TrainingBatchStatus, string> = {
  OPEN: 'Open',
  FULL: 'Full',
  CLOSED: 'Closed',
  COMPLETED: 'Completed',
};

export function seatsLeft(batch: { seats: number; seatsFilled: number }): number {
  return Math.max(batch.seats - batch.seatsFilled, 0);
}

// --- Government / tenders -----------------------------------------------------

export type GovOpportunityType = 'TENDER' | 'SCHEME' | 'SUBSIDY';
export type GovOpportunityStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export const GOV_TYPE_LABELS: Record<GovOpportunityType, string> = {
  TENDER: 'Tender',
  SCHEME: 'Scheme',
  SUBSIDY: 'Subsidy',
};

export const GOV_STATUS_LABELS: Record<GovOpportunityStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CLOSED: 'Closed',
};

/** Whole days until `closing` (negative once closed); null when no closing date. */
export function daysUntil(closing?: string | null, now = new Date()): number | null {
  if (!closing) return null;
  const end = new Date(closing).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now.getTime()) / 86_400_000);
}

export function closingLabel(closing?: string | null, now = new Date()): string {
  const d = daysUntil(closing, now);
  if (d === null) return 'Open-ended';
  if (d < 0) return 'Closed';
  if (d === 0) return 'Closes today';
  if (d === 1) return 'Closes tomorrow';
  return `Closes in ${d} days`;
}

/** ₹ amounts in Indian units: ₹4.5 Cr, ₹12.0 L, ₹85,000. "Not disclosed" when empty. */
export function formatInrCompact(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Not disclosed';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Not disclosed';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** Prefilled enquiry (lead type TENDER) when a visitor expresses interest in an opportunity. */
export function tenderEnquiryDefaults(item: {
  title: string;
  issuingBody: string;
  referenceNo?: string | null;
}): { subject: string; message: string } {
  const subject = `Interest in: ${item.title}`.slice(0, 300);
  const message = [
    `I would like to participate in / learn more about "${item.title}" issued by ${item.issuingBody}.`,
    item.referenceNo ? `Reference: ${item.referenceNo}` : null,
    'Organisation and capability details:',
  ]
    .filter((l): l is string => Boolean(l))
    .join('\n');
  return { subject, message };
}
