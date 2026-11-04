import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountType,
  CatalogCategory,
  ListingReviewStatus,
  ListingType,
  Prisma,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { categoryAllowedForListingType } from './catalog-category.constants';
import { CreateListingDto, UpdateListingDto } from './dto/listing.dto';
import { PartnerBillingService } from '../partner-billing/partner-billing.service';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: PartnerBillingService,
  ) {}

  async createForPartner(userId: string, dto: CreateListingDto) {
    const org = await this.requireApprovedPartnerOrg(userId);
    this.validatePricing(dto.priceOnRequest ?? true, dto.priceInr);
    this.validateCategoryForListingType(dto.category, dto.listingType);

    return this.prisma.partnerListing.create({
      data: {
        organizationId: org.id,
        listingType: dto.listingType,
        name: dto.name,
        brand: dto.brand,
        sku: dto.sku,
        primaryImageUrl: dto.primaryImageUrl,
        galleryImageUrls: dto.galleryImageUrls ?? [],
        category: dto.category,
        description: dto.description,
        technicalSpecs: dto.technicalSpecs,
        applications: dto.applications ?? [],
        country: dto.country,
        state: dto.state,
        city: dto.city,
        minOrderQuantity: dto.minOrderQuantity,
        priceOnRequest: dto.priceOnRequest ?? true,
        priceInr:
          dto.priceOnRequest === false && dto.priceInr != null
            ? new Prisma.Decimal(dto.priceInr)
            : null,
        warranty: dto.warranty,
        isPublished: false,
        reviewStatus: ListingReviewStatus.DRAFT,
      },
    });
  }

  listMine(userId: string) {
    return this.prisma.partnerListing.findMany({
      where: { organization: { ownerId: userId } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMine(userId: string, listingId: string) {
    const listing = await this.prisma.partnerListing.findFirst({
      where: { id: listingId, organization: { ownerId: userId } },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  async updateMine(userId: string, listingId: string, dto: UpdateListingDto) {
    const existing = await this.getMine(userId, listingId);
    await this.requireApprovedPartnerOrg(userId);

    if (existing.reviewStatus === ListingReviewStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Listing is currently pending admin review and cannot be edited. Please wait for review completion.',
      );
    }

    const priceOnRequest = dto.priceOnRequest ?? existing.priceOnRequest;
    const priceInr =
      dto.priceInr ??
      (existing.priceInr != null ? existing.priceInr.toNumber() : undefined);
    if (dto.priceOnRequest !== undefined || dto.priceInr !== undefined) {
      this.validatePricing(priceOnRequest, priceInr);
    }

    if (
      dto.category != null &&
      !categoryAllowedForListingType(dto.category, existing.listingType)
    ) {
      throw new BadRequestException(
        `Category ${dto.category} is not valid for ${existing.listingType} listings`,
      );
    }

    // Material edits to an already approved live listing reset it to DRAFT for safety
    const wasApproved = existing.reviewStatus === ListingReviewStatus.APPROVED;

    return this.prisma.partnerListing.update({
      where: { id: listingId },
      data: {
        name: dto.name,
        brand: dto.brand,
        sku: dto.sku,
        primaryImageUrl: dto.primaryImageUrl,
        galleryImageUrls: dto.galleryImageUrls,
        category: dto.category,
        description: dto.description,
        technicalSpecs: dto.technicalSpecs,
        applications: dto.applications,
        country: dto.country,
        state: dto.state,
        city: dto.city,
        minOrderQuantity: dto.minOrderQuantity,
        warranty: dto.warranty,
        priceOnRequest: dto.priceOnRequest,
        reviewStatus: wasApproved
          ? ListingReviewStatus.DRAFT
          : existing.reviewStatus,
        isPublished: wasApproved ? false : existing.isPublished,
        rejectionReason: null,
        priceInr:
          dto.priceOnRequest === true
            ? null
            : dto.priceInr != null
              ? new Prisma.Decimal(dto.priceInr)
              : dto.priceOnRequest === false
                ? existing.priceInr
                : undefined,
      },
    });
  }

  async submitForReview(userId: string, listingId: string) {
    const listing = await this.getMine(userId, listingId);
    await this.requireApprovedPartnerOrg(userId);

    if (listing.reviewStatus === ListingReviewStatus.PENDING_REVIEW) {
      throw new BadRequestException('Listing is already pending review');
    }
    if (
      listing.reviewStatus === ListingReviewStatus.APPROVED &&
      listing.isPublished
    ) {
      throw new BadRequestException('Listing is already approved and live');
    }

    return this.prisma.partnerListing.update({
      where: { id: listingId },
      data: {
        reviewStatus: ListingReviewStatus.PENDING_REVIEW,
        submittedForReviewAt: new Date(),
        isPublished: false,
      },
    });
  }

  async deleteMine(userId: string, listingId: string) {
    await this.getMine(userId, listingId);
    await this.prisma.partnerListing.delete({ where: { id: listingId } });
    return { deleted: true };
  }

  private buildBrowsePublicWhere(filters: {
    listingType?: ListingType;
    category?: CatalogCategory;
    categories?: CatalogCategory[];
    q?: string;
    state?: string;
    priceType?: 'priced' | 'rfq';
  }): Prisma.PartnerListingWhereInput {
    const q = filters.q?.trim();
    const state = filters.state?.trim();
    const categoryFilter = filters.categories?.length
      ? { category: { in: filters.categories } }
      : filters.category
        ? { category: filters.category }
        : {};

    return {
      isPublished: true,
      reviewStatus: ListingReviewStatus.APPROVED,
      listingType: filters.listingType,
      ...categoryFilter,
      ...(filters.priceType === 'priced'
        ? { priceOnRequest: false }
        : filters.priceType === 'rfq'
          ? { priceOnRequest: true }
          : {}),
      organization: {
        verificationStatus: VerificationStatus.APPROVED,
        ...(state
          ? { state: { equals: state, mode: 'insensitive' as const } }
          : {}),
      },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { brand: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async browsePublic(filters: {
    listingType?: ListingType;
    category?: CatalogCategory;
    categories?: CatalogCategory[];
    q?: string;
    state?: string;
    priceType?: 'priced' | 'rfq';
    sort?: 'newest' | 'price_asc' | 'price_desc';
    skip?: number;
    take?: number;
  }) {
    const take = Math.min(filters.take ?? 20, 50);
    const skip = filters.skip ?? 0;
    const where = this.buildBrowsePublicWhere(filters);
    const orderBy: Prisma.PartnerListingOrderByWithRelationInput[] =
      filters.sort === 'price_asc'
        ? [{ priceInr: { sort: 'asc', nulls: 'last' } }, { updatedAt: 'desc' }]
        : filters.sort === 'price_desc'
          ? [
              { priceInr: { sort: 'desc', nulls: 'last' } },
              { updatedAt: 'desc' },
            ]
          : [{ updatedAt: 'desc' }];

    const [rawItems, total] = await Promise.all([
      this.prisma.partnerListing.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              companyName: true,
              country: true,
              state: true,
              city: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.partnerListing.count({ where }),
    ]);

    const items =
      filters.sort === 'price_asc' || filters.sort === 'price_desc'
        ? rawItems
        : await this.rankListingsByEntitlements(rawItems);

    return { items, total, skip, take };
  }

  /** Boost admin-featured + plan `featuredPlacement` within the current page (NEXT-P3). */
  private async rankListingsByEntitlements<
    T extends {
      featuredOnMarketplace: boolean;
      updatedAt: Date;
      organization: { id: string };
    },
  >(items: T[]): Promise<T[]> {
    if (items.length < 2) return items;
    const entitlements = await this.billing.getEntitlementsForOrganizations(
      items.map((i) => i.organization.id),
    );
    const score = (row: T) =>
      (row.featuredOnMarketplace ? 100 : 0) +
      (entitlements.get(row.organization.id)?.featuredPlacement ? 50 : 0);
    return [...items].sort((a, b) => {
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }

  /** Admin-featured listings for the marketplace hero row (newest featured first). */
  async listFeaturedPublic(take = 8) {
    const limit = Math.min(Math.max(take, 1), 12);
    const items = await this.prisma.partnerListing.findMany({
      where: {
        ...this.buildBrowsePublicWhere({}),
        featuredOnMarketplace: true,
      },
      include: {
        organization: {
          select: {
            id: true,
            companyName: true,
            country: true,
            state: true,
            city: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit * 2,
    });
    const ranked = await this.rankListingsByEntitlements(items);
    return { items: ranked.slice(0, limit) };
  }

  async getPublicListing(listingId: string) {
    const listing = await this.prisma.partnerListing.findFirst({
      where: {
        id: listingId,
        isPublished: true,
        reviewStatus: ListingReviewStatus.APPROVED,
        organization: { verificationStatus: VerificationStatus.APPROVED },
      },
      include: {
        organization: {
          select: {
            id: true,
            companyName: true,
            country: true,
            state: true,
            city: true,
            website: true,
            industries: true,
          },
        },
      },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  /** Best-effort PDP view counter; at most one row per listing + visitor per 24h. */
  async recordListingView(
    listingId: string,
    organizationId: string,
    visitorKey: string,
    viewerUserId?: string | null,
  ) {
    try {
      if (viewerUserId) {
        const ownerOrg = await this.prisma.organization.findUnique({
          where: { ownerId: viewerUserId },
          select: { id: true },
        });
        if (ownerOrg?.id === organizationId) {
          return;
        }
      }
      const since = new Date(Date.now() - 86_400_000);
      const recent = await this.prisma.listingView.findFirst({
        where: { listingId, visitorKey, createdAt: { gte: since } },
        select: { id: true },
      });
      if (recent) return;
      await this.prisma.listingView.create({
        data: { listingId, organizationId, visitorKey },
      });
    } catch {
      // swallow: analytics must not break the public catalog
    }
  }

  async listPublicVendors(filters: {
    skip?: number;
    take?: number;
    q?: string;
    state?: string;
    accountType?: AccountType;
    category?: CatalogCategory;
    hasListings?: boolean;
  }) {
    const take = Math.min(filters.take ?? 24, 50);
    const skip = filters.skip ?? 0;
    const q = filters.q?.trim();
    const state = filters.state?.trim();
    const publishedListing = {
      isPublished: true,
      reviewStatus: ListingReviewStatus.APPROVED,
    };

    const where: Prisma.OrganizationWhereInput = {
      verificationStatus: VerificationStatus.APPROVED,
      ...(state
        ? { state: { equals: state, mode: 'insensitive' as const } }
        : {}),
      ...(filters.accountType
        ? { owner: { accountType: filters.accountType } }
        : {}),
      ...(filters.category
        ? {
            listings: {
              some: { ...publishedListing, category: filters.category },
            },
          }
        : filters.hasListings
          ? { listings: { some: publishedListing } }
          : {}),
      ...(q
        ? {
            OR: [
              { companyName: { contains: q, mode: 'insensitive' as const } },
              { city: { contains: q, mode: 'insensitive' as const } },
              { state: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        select: {
          id: true,
          companyName: true,
          country: true,
          state: true,
          city: true,
          website: true,
          industries: true,
          owner: { select: { accountType: true } },
          _count: {
            select: {
              listings: {
                where: {
                  isPublished: true,
                  reviewStatus: ListingReviewStatus.APPROVED,
                },
              },
            },
          },
        },
        orderBy: [{ companyName: 'asc' }],
        skip,
        take,
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  /** Distinct states of verified vendors with published listings (filter facets). */
  async listPublicFacets() {
    const rows = await this.prisma.organization.findMany({
      where: {
        verificationStatus: VerificationStatus.APPROVED,
        state: { not: null },
        listings: {
          some: {
            isPublished: true,
            reviewStatus: ListingReviewStatus.APPROVED,
          },
        },
      },
      select: { state: true },
      distinct: ['state'],
      orderBy: { state: 'asc' },
    });
    return {
      states: rows
        .map((r) => r.state?.trim())
        .filter((v): v is string => Boolean(v)),
    };
  }

  /** Compare v1: up to 4 published listings by id (no analytics view recorded). */
  async getPublicListingsByIds(ids: string[]) {
    const unique = [
      ...new Set(ids.map((id) => id.trim()).filter(Boolean)),
    ].slice(0, 4);
    if (unique.length === 0) return { items: [] };
    const items = await this.prisma.partnerListing.findMany({
      where: {
        id: { in: unique },
        isPublished: true,
        reviewStatus: ListingReviewStatus.APPROVED,
        organization: { verificationStatus: VerificationStatus.APPROVED },
      },
      include: {
        organization: {
          select: {
            id: true,
            companyName: true,
            country: true,
            state: true,
            city: true,
            website: true,
          },
        },
      },
    });
    const order = new Map(unique.map((id, i) => [id, i]));
    items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return { items };
  }

  async getPublicPartnerProfile(orgId: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        id: orgId,
        verificationStatus: VerificationStatus.APPROVED,
      },
      select: {
        id: true,
        companyName: true,
        country: true,
        state: true,
        city: true,
        website: true,
        industries: true,
        productsServicesDescription: true,
        _count: {
          select: {
            listings: {
              where: {
                isPublished: true,
                reviewStatus: ListingReviewStatus.APPROVED,
              },
            },
          },
        },
      },
    });
    if (!org) {
      throw new NotFoundException('Partner not found');
    }
    return org;
  }

  private async requireApprovedPartnerOrg(userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    if (org.verificationStatus !== VerificationStatus.APPROVED) {
      throw new ForbiddenException(
        'Partner must be verified before managing catalog listings',
      );
    }
    return org;
  }

  private validatePricing(priceOnRequest: boolean, priceInr?: number | null) {
    if (!priceOnRequest && (priceInr == null || priceInr < 0)) {
      throw new BadRequestException(
        'priceInr is required when priceOnRequest is false',
      );
    }
  }

  private validateCategoryForListingType(
    category: CatalogCategory,
    listingType: ListingType,
  ) {
    if (!categoryAllowedForListingType(category, listingType)) {
      throw new BadRequestException(
        `Category ${category} is not valid for ${listingType} listings`,
      );
    }
  }
}
