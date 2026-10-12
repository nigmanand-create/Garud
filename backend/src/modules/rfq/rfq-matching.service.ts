import { AccountType, CatalogCategory, ListingType, UserRole, VerificationStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

const VENDOR_ACCOUNT_TYPES: AccountType[] = [
  AccountType.MANUFACTURER,
  AccountType.OEM,
  AccountType.INTERNATIONAL_COMPANY,
  AccountType.DISTRIBUTOR,
  AccountType.DEALER,
  AccountType.SERVICE_PROVIDER,
  AccountType.TECHNOLOGY_COMPANY,
];

@Injectable()
export class RfqMatchingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verified partners with a listing in the RFQ category (and optional listing type),
   * or approved product-channel account types with any listing in that category.
   */
  async findVendorOrganizationIds(
    category: CatalogCategory,
    listingType?: ListingType,
  ): Promise<string[]> {
    const listingFilter = {
      category,
      ...(listingType ? { listingType } : {}),
    };

    const orgs = await this.prisma.organization.findMany({
      where: {
        verificationStatus: VerificationStatus.APPROVED,
        owner: { role: UserRole.PARTNER },
        OR: [
          { listings: { some: listingFilter } },
          {
            owner: { accountType: { in: VENDOR_ACCOUNT_TYPES } },
            listings: { some: { category } },
          },
        ],
      },
      select: { id: true },
    });

    return [...new Set(orgs.map((o) => o.id))];
  }
}
