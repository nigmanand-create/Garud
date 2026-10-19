import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CatalogCategory,
  ListingReviewStatus,
  ListingType,
  Prisma,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateListingDto, UpdateListingDto } from './dto/listing.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async createForPartner(userId: string, dto: CreateListingDto) {
    const org = await this.requireApprovedPartnerOrg(userId);
    this.validatePricing(dto.priceOnRequest ?? true, dto.priceInr);

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

  browsePublic(filters: {
    listingType?: ListingType;
    category?: CatalogCategory;
    skip?: number;
    take?: number;
  }) {
    const take = Math.min(filters.take ?? 20, 50);
    const skip = filters.skip ?? 0;

    return this.prisma.partnerListing.findMany({
      where: {
        isPublished: true,
        reviewStatus: ListingReviewStatus.APPROVED,
        listingType: filters.listingType,
        category: filters.category,
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
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    });
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
}
