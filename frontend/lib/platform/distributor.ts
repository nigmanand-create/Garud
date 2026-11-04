export type DistributorRequestType = 'DISTRIBUTOR' | 'DEALER';

export const DISTRIBUTOR_TYPE_LABELS: Record<DistributorRequestType, string> = {
  DISTRIBUTOR: 'Distributor',
  DEALER: 'Dealer / reseller',
};

export function parseDistributorType(value: string | null | undefined): DistributorRequestType {
  return value?.toUpperCase() === 'DEALER' ? 'DEALER' : 'DISTRIBUTOR';
}

export type DistributorFormValues = {
  type: DistributorRequestType;
  company: string;
  territory: string;
  experience: string;
  annualVolume: string;
  notes: string;
  productName?: string;
  supplierName?: string;
};

export function buildDistributorSubject(
  type: DistributorRequestType,
  productName?: string,
): string {
  const label = type === 'DEALER' ? 'Dealership' : 'Distributorship';
  return productName ? `${label} request: ${productName}` : `${label} request`;
}

/**
 * Structured lead body — enquiries have a single free-text `message`, so partner inboxes and
 * admin triage get a consistent, scannable block instead of new schema fields.
 */
export function buildDistributorMessage(v: DistributorFormValues): string {
  const lines = [
    `Request type: ${DISTRIBUTOR_TYPE_LABELS[v.type]}`,
    v.productName ? `Product / range: ${v.productName}` : null,
    v.supplierName ? `Supplier: ${v.supplierName}` : null,
    `Company: ${v.company.trim()}`,
    `Proposed territory: ${v.territory.trim()}`,
    v.experience.trim() ? `Relevant experience: ${v.experience.trim()}` : null,
    v.annualVolume.trim() ? `Expected annual volume: ${v.annualVolume.trim()}` : null,
    v.notes.trim() ? `\nNotes:\n${v.notes.trim()}` : null,
  ];
  return lines.filter(Boolean).join('\n');
}
