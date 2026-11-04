import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  GovOpportunityStatus,
  GovOpportunityType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { GovService } from './gov.service';
import { GovBidDocumentService } from './gov-bid-document.service';
import { areTenderBidsUnsealed, isOpportunityExpired } from './gov.rules';

describe('gov rules', () => {
  it('flags expired closing dates', () => {
    const now = new Date('2026-11-04T00:00:00Z');
    expect(isOpportunityExpired(null, now)).toBe(false);
    expect(isOpportunityExpired(new Date('2026-11-05T00:00:00Z'), now)).toBe(
      false,
    );
    expect(isOpportunityExpired(new Date('2026-11-03T00:00:00Z'), now)).toBe(
      true,
    );
  });

  it('unseals bids only after closing datetime', () => {
    const now = new Date('2026-11-04T12:00:00Z');
    expect(areTenderBidsUnsealed(null, now)).toBe(false);
    expect(areTenderBidsUnsealed(new Date('2026-11-05T00:00:00Z'), now)).toBe(
      false,
    );
    expect(areTenderBidsUnsealed(new Date('2026-11-04T12:00:00Z'), now)).toBe(
      true,
    );
  });
});

describe('GovService', () => {
  let service: GovService;
  const prismaMock = {
    govOpportunity: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    govOpportunityBid: {
      count: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const bidDocumentsMock = {
    assertOwnedBidPath: jest.fn(),
    openForAdmin: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        GovService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GovBidDocumentService, useValue: bidDocumentsMock },
      ],
    }).compile();
    service = module.get(GovService);
  });

  const base = {
    type: GovOpportunityType.TENDER,
    title: 'Drone survey tender',
    summary: 'Aerial survey of 40 villages',
    issuingBody: 'Dept of Revenue',
  };

  it('public list only returns published, unexpired opportunities by default', async () => {
    prismaMock.govOpportunity.findMany.mockResolvedValue([
      { id: 'g1', closingDate: null },
    ]);
    prismaMock.govOpportunity.count.mockResolvedValue(1);

    const res = await service.listPublic({ q: 'survey', state: 'Goa' });

    const where = prismaMock.govOpportunity.findMany.mock.calls[0][0].where;
    expect(where.status).toBe(GovOpportunityStatus.PUBLISHED);
    expect(where.AND).toHaveLength(2);
    expect(res.items[0]).toMatchObject({ id: 'g1', isExpired: false });
  });

  it('includeExpired drops the closing-date filter', async () => {
    prismaMock.govOpportunity.findMany.mockResolvedValue([]);
    prismaMock.govOpportunity.count.mockResolvedValue(0);
    await service.listPublic({ includeExpired: true });
    expect(
      prismaMock.govOpportunity.findMany.mock.calls[0][0].where.AND,
    ).toEqual([]);
  });

  it('drafts are not publicly readable', async () => {
    prismaMock.govOpportunity.findFirst.mockResolvedValue(null);
    await expect(service.getPublic('g1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.govOpportunity.findFirst.mock.calls[0][0].where).toEqual({
      id: 'g1',
      status: { not: GovOpportunityStatus.DRAFT },
    });
  });

  it('creates drafts by default and stamps publishedAt when published', async () => {
    prismaMock.govOpportunity.create.mockResolvedValue({
      id: 'g1',
      closingDate: null,
    });
    await service.create('admin-1', base);
    expect(
      prismaMock.govOpportunity.create.mock.calls[0][0].data,
    ).toMatchObject({
      status: GovOpportunityStatus.DRAFT,
      publishedAt: null,
      createdByUserId: 'admin-1',
    });

    await service.create('admin-1', {
      ...base,
      status: GovOpportunityStatus.PUBLISHED,
    });
    expect(
      prismaMock.govOpportunity.create.mock.calls[1][0].data.publishedAt,
    ).toBeInstanceOf(Date);
  });

  it('rejects closing date before open date', async () => {
    await expect(
      service.create('admin-1', {
        ...base,
        openDate: '2026-12-10',
        closingDate: '2026-12-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publishing an existing draft sets publishedAt once', async () => {
    prismaMock.govOpportunity.findUnique.mockResolvedValue({
      id: 'g1',
      openDate: null,
      closingDate: null,
      publishedAt: null,
    });
    prismaMock.govOpportunity.update.mockResolvedValue({
      id: 'g1',
      closingDate: null,
    });
    await service.update('g1', { status: GovOpportunityStatus.PUBLISHED });
    expect(
      prismaMock.govOpportunity.update.mock.calls[0][0].data.publishedAt,
    ).toBeInstanceOf(Date);

    prismaMock.govOpportunity.findUnique.mockResolvedValue({
      id: 'g1',
      openDate: null,
      closingDate: null,
      publishedAt: new Date(),
    });
    await service.update('g1', { status: GovOpportunityStatus.CLOSED });
    expect(
      prismaMock.govOpportunity.update.mock.calls[1][0].data.publishedAt,
    ).toBeUndefined();
  });

  it('keeps admin bid list sealed before closing date', async () => {
    prismaMock.govOpportunityBid.count.mockResolvedValue(3);
    const closing = new Date('2026-12-01T00:00:00Z');
    const res = await service.listBidsForAdmin('g1', closing);
    expect(res.sealed).toBe(true);
    expect(res.bidCount).toBe(3);
    expect(res.items).toEqual([]);
    expect(prismaMock.govOpportunityBid.findMany).not.toHaveBeenCalled();
  });

  it('submits a bid for an open tender', async () => {
    prismaMock.govOpportunity.findUnique.mockResolvedValue({
      id: 'g1',
      type: 'TENDER',
      status: 'PUBLISHED',
      closingDate: new Date('2099-01-01'),
      openDate: null,
    });
    prismaMock.govOpportunityBid.upsert.mockResolvedValue({
      id: 'b1',
      opportunityId: 'g1',
      amountInr: 100,
      storedRelativePath: null,
      updatedAt: new Date(),
    });
    const res = await service.submitBid('u1', UserRole.BUYER, 'g1', {
      amountInr: 100,
    });
    expect(res.id).toBe('b1');
    expect(prismaMock.govOpportunityBid.upsert).toHaveBeenCalled();
  });

  it('blocks admin bid download while sealed', async () => {
    prismaMock.govOpportunity.findUnique.mockResolvedValue({
      type: 'TENDER',
      closingDate: new Date('2099-01-01'),
    });
    await expect(
      service.downloadBidDocumentForAdmin('g1', 'b1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
