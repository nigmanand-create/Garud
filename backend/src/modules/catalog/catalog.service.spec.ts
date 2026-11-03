import { Test, TestingModule } from '@nestjs/testing';
import {
  CatalogCategory,
  ListingReviewStatus,
  ListingType,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;

  const prismaMock = {
    partnerListing: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
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
