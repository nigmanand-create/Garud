import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountType,
  CatalogCategory,
  ListingReviewStatus,
  ListingType,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CatalogService } from './catalog.service';
import { PartnerBillingService } from '../partner-billing/partner-billing.service';

describe('CatalogService', () => {
  let service: CatalogService;

  const billingMock = {
    getEntitlementsForOrganizations: jest.fn().mockResolvedValue(new Map()),
  };

  const prismaMock = {
    partnerListing: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    organization: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    listingView: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PartnerBillingService, useValue: billingMock },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  describe('recordListingView', () => {
    it('skips when the viewer owns the listing organization', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      await service.recordListingView('listing-1', 'org-1', 'visitor-1', 'partner-user');
      expect(prismaMock.listingView.create).not.toHaveBeenCalled();
    });

    it('records a view for other visitors', async () => {
      prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-other' });
      prismaMock.listingView.findFirst.mockResolvedValue(null);
      prismaMock.listingView.create.mockResolvedValue({});
      await service.recordListingView('listing-1', 'org-1', 'visitor-1', 'buyer-user');
      expect(prismaMock.listingView.create).toHaveBeenCalled();
    });
  });

  describe('browsePublic', () => {
    it('returns paginated items and total using the same filter set', async () => {
      const items = [{ id: 'listing-1', name: 'Agri drone' }];
      prismaMock.partnerListing.findMany.mockResolvedValue(items);
      prismaMock.partnerListing.count.mockResolvedValue(42);

      const result = await service.browsePublic({
        listingType: ListingType.PRODUCT,
        category: CatalogCategory.AGRICULTURE_DRONE,
        q: 'spray',
        skip: 24,
        take: 24,
      });

      expect(result).toEqual({
        items,
        total: 42,
        skip: 24,
        take: 24,
      });

      const expectedWhere = {
        isPublished: true,
        reviewStatus: ListingReviewStatus.APPROVED,
        listingType: ListingType.PRODUCT,
        category: CatalogCategory.AGRICULTURE_DRONE,
        organization: { verificationStatus: VerificationStatus.APPROVED },
        OR: [
          { name: { contains: 'spray', mode: 'insensitive' } },
          { description: { contains: 'spray', mode: 'insensitive' } },
          { brand: { contains: 'spray', mode: 'insensitive' } },
        ],
      };

      expect(prismaMock.partnerListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expectedWhere,
          skip: 24,
          take: 24,
        }),
      );
      expect(prismaMock.partnerListing.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });

    it('lists verified vendors with pagination and optional search', async () => {
      const items = [{ id: 'org-1', companyName: 'AgriFly', _count: { listings: 3 } }];
      prismaMock.organization.findMany.mockResolvedValue(items);
      prismaMock.organization.count.mockResolvedValue(1);

      const result = await service.listPublicVendors({
        q: 'agri',
        skip: 0,
        take: 10,
      });

      expect(result).toEqual({
        items,
        total: 1,
        skip: 0,
        take: 10,
      });

      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            verificationStatus: VerificationStatus.APPROVED,
            OR: expect.any(Array),
          }),
          skip: 0,
          take: 10,
        }),
      );
    });

    it('applies state, price type and price sort filters (Phase 4)', async () => {
      prismaMock.partnerListing.findMany.mockResolvedValue([]);
      prismaMock.partnerListing.count.mockResolvedValue(0);

      await service.browsePublic({
        state: 'Karnataka',
        priceType: 'priced',
        sort: 'price_asc',
      });

      expect(prismaMock.partnerListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priceOnRequest: false,
            organization: {
              verificationStatus: VerificationStatus.APPROVED,
              state: { equals: 'Karnataka', mode: 'insensitive' },
            },
          }),
          orderBy: [
            { priceInr: { sort: 'asc', nulls: 'last' } },
            { updatedAt: 'desc' },
          ],
        }),
      );
    });

    it('filters vendors by state, account type and offered category', async () => {
      prismaMock.organization.findMany.mockResolvedValue([]);
      prismaMock.organization.count.mockResolvedValue(0);

      await service.listPublicVendors({
        state: 'Gujarat',
        accountType: AccountType.DISTRIBUTOR,
        category: CatalogCategory.COMPONENT,
      });

      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            verificationStatus: VerificationStatus.APPROVED,
            state: { equals: 'Gujarat', mode: 'insensitive' },
            owner: { accountType: AccountType.DISTRIBUTOR },
            listings: {
              some: {
                isPublished: true,
                reviewStatus: ListingReviewStatus.APPROVED,
                category: CatalogCategory.COMPONENT,
              },
            },
          }),
        }),
      );
    });

    it('returns compare listings in requested order, capped at 4 unique ids', async () => {
      prismaMock.partnerListing.findMany.mockResolvedValue([
        { id: 'b' },
        { id: 'a' },
      ]);

      const result = await service.getPublicListingsByIds([
        'a',
        'b',
        'a',
        'c',
        'd',
        'e',
      ]);

      expect(result.items.map((i: { id: string }) => i.id)).toEqual(['a', 'b']);
      expect(prismaMock.partnerListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['a', 'b', 'c', 'd'] },
            isPublished: true,
          }),
        }),
      );
    });

    it('returns distinct vendor states as filter facets', async () => {
      prismaMock.organization.findMany.mockResolvedValue([
        { state: 'Delhi' },
        { state: ' Gujarat ' },
      ]);
      await expect(service.listPublicFacets()).resolves.toEqual({
        states: ['Delhi', 'Gujarat'],
      });
    });

    it('caps take at 50 and filters by multiple categories', async () => {
      prismaMock.partnerListing.findMany.mockResolvedValue([]);
      prismaMock.partnerListing.count.mockResolvedValue(0);

      await service.browsePublic({
        categories: [
          CatalogCategory.COMPONENT,
          CatalogCategory.PAYLOAD,
        ],
        take: 100,
      });

      expect(prismaMock.partnerListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: {
              in: [CatalogCategory.COMPONENT, CatalogCategory.PAYLOAD],
            },
          }),
          take: 50,
        }),
      );
    });
  });
});
