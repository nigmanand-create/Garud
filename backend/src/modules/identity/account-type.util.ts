import { AccountType, UserRole, VerificationStatus } from '@prisma/client';

const PARTNER_ACCOUNT_TYPES: AccountType[] = [
  AccountType.MANUFACTURER,
  AccountType.OEM,
  AccountType.INTERNATIONAL_COMPANY,
  AccountType.DISTRIBUTOR,
  AccountType.DEALER,
  AccountType.SERVICE_PROVIDER,
  AccountType.TRAINING_INSTITUTE,
  AccountType.TECHNOLOGY_COMPANY,
];

export function roleForAccountType(accountType: AccountType): UserRole {
  switch (accountType) {
    case AccountType.BUYER_ENTERPRISE:
      return UserRole.BUYER;
    case AccountType.GOVERNMENT_PSU:
      return UserRole.GOVERNMENT;
    default:
      return UserRole.PARTNER;
  }
}

export function isPartnerAccountType(accountType: AccountType): boolean {
  return PARTNER_ACCOUNT_TYPES.includes(accountType);
}

export function initialVerificationStatus(
  accountType: AccountType,
): VerificationStatus {
  if (isPartnerAccountType(accountType)) {
    return VerificationStatus.DRAFT;
  }
  return VerificationStatus.APPROVED;
}

export function requiresPartnerVerification(
  status: VerificationStatus,
): boolean {
  return status === VerificationStatus.APPROVED;
}

/** Fallback when individual buyers omit company name (MinLength(2) on DTO). */
export function resolveCompanyNameForRegistration(
  accountType: AccountType,
  fields: {
    companyName?: string;
    contactPersonName?: string;
    email: string;
    displayName?: string;
  },
): string {
  const trimmed = (fields.companyName ?? '').trim();
  if (trimmed.length >= 2) {
    return trimmed;
  }
  if (accountType !== AccountType.BUYER_ENTERPRISE) {
    return trimmed;
  }
  const fromContact = (fields.contactPersonName ?? '').trim();
  if (fromContact.length >= 2) {
    return fromContact;
  }
  const fromDisplay = (fields.displayName ?? '').trim();
  if (fromDisplay.length >= 2) {
    return fromDisplay;
  }
  return `Individual buyer — ${fields.email.trim()}`;
}
