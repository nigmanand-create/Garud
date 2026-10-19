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
