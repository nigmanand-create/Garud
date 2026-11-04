import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { clampDays, PartnerHubService } from './partner-hub.service';

describe('clampDays', () => {
  it('defaults and clamps', () => {
    expect(clampDays()).toBe(30);
    expect(clampDays(1)).toBe(7);
    expect(clampDays(500)).toBe(90);
    expect(clampDays(45)).toBe(45);
  });
});

describe('PartnerHubService', () => {
  let service: PartnerHubService;

  const prismaMock = {
    organization: { findUnique: jest.fn() },
    rfqInvite: { count: jest.fn(), groupBy: jest.fn() },
    order: { count: jest.fn(), aggregate: jest.fn() },
    partnerListing: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    lead: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    enquiry: { count: jest.fn(), groupBy: jest.fn() },
    conversation: { findMany: jest.fn() },
    partnershipRequest: { count: jest.fn() },
    listingView: { count: jest.fn(), groupBy: jest.fn() },
    quotation: { groupBy: jest.fn() },
    verificationAuditLog: { findMany: jest.fn() },
    listingModerationAuditLog: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PartnerHubService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(PartnerHubService);
    prismaMock.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      companyName: 'Acme Drones',
      verificationStatus: 'APPROVED',
    });
  });

  it('throws when the user has no organization', async () => {
    prismaMock.organization.findUnique.mockResolvedValue(null);
    await expect(service.getOverview('u')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('builds overview widgets from live counts', async () => {
    prismaMock.rfqInvite.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    prismaMock.order.count.mockResolvedValue(4);
    prismaMock.partnerListing.groupBy.mockResolvedValue([
      { reviewStatus: 'APPROVED', _count: { _all: 5 } },
      { reviewStatus: 'DRAFT', _count: { _all: 1 } },
    ]);
    prismaMock.lead.count.mockResolvedValue(6);
    prismaMock.enquiry.count.mockResolvedValue(7);
    const t0 = new Date('2026-01-01T10:00:00Z');
    const t1 = new Date('2026-01-01T11:00:00Z');
    prismaMock.conversation.findMany.mockResolvedValue([
      { lastMessageAt: t1, partnerLastReadAt: null },
      { lastMessageAt: t1, partnerLastReadAt: t1 },
      { lastMessageAt: t1, partnerLastReadAt: t0 },
    ]);
    prismaMock.partnershipRequest.count.mockResolvedValue(1);
    prismaMock.listingView.count.mockResolvedValue(120);

    const res = await service.getOverview('u');

    expect(res.rfq).toEqual({ awaitingQuote: 3, quoted: 2 });
    expect(res.ordersToFulfill).toBe(4);
    expect(res.catalog.APPROVED).toBe(5);
    expect(res.catalog.PENDING_REVIEW).toBe(0);
    expect(res.newLeads).toBe(6);
    expect(res.newEnquiries).toBe(7);
    expect(res.unreadMessages).toBe(2);
    expect(res.pendingPartnerships).toBe(1);
    expect(res.views30d).toBe(120);
  });

  it('builds analytics with zero-filled daily views and rates', async () => {
    const today = new Date().toISOString().slice(0, 10);
    prismaMock.listingView.count.mockResolvedValue(10);
    prismaMock.$queryRaw.mockResolvedValue([
      { day: new Date(`${today}T00:00:00Z`), count: 10 },
    ]);
    prismaMock.listingView.groupBy.mockResolvedValue([
      { listingId: 'l-1', _count: { _all: 10 } },
    ]);
    prismaMock.partnerListing.findMany.mockResolvedValue([
      { id: 'l-1', name: 'X10', listingType: 'PRODUCT' },
    ]);
    prismaMock.enquiry.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { _all: 2 } },
    ]);
    prismaMock.lead.groupBy.mockResolvedValue([
      { status: 'WON', _count: { _all: 1 } },
      { status: 'LOST', _count: { _all: 3 } },
    ]);
    prismaMock.lead.count.mockResolvedValue(2);
    prismaMock.rfqInvite.groupBy.mockResolvedValue([
      { status: 'INVITED', _count: { _all: 2 } },
      { status: 'QUOTED', _count: { _all: 1 } },
      { status: 'DECLINED', _count: { _all: 1 } },
    ]);
    prismaMock.quotation.groupBy.mockResolvedValue([
      { status: 'ACCEPTED', _count: { _all: 1 } },
      { status: 'REJECTED', _count: { _all: 1 } },
    ]);
    prismaMock.order.aggregate.mockResolvedValue({
      _count: { _all: 2 },
      _sum: { totalInr: '150000.50' },
    });

    const res = await service.getAnalytics('u', 14);

    expect(res.periodDays).toBe(14);
    expect(res.views.byDay).toHaveLength(14);
    expect(res.views.byDay[13]).toEqual({ date: today, count: 10 });
    expect(res.views.byDay[0].count).toBe(0);
    expect(res.views.topListings[0]).toMatchObject({ name: 'X10', views: 10 });
    expect(res.enquiries.total).toBe(2);
    expect(res.leads.winRate).toBeCloseTo(0.25);
    expect(res.rfq.responseRate).toBeCloseTo(0.5);
    expect(res.rfq.acceptanceRate).toBeCloseTo(0.5);
    expect(res.orders).toEqual({ count: 2, gmvInr: 150000.5 });
  });

  it('returns null rates when there is no data', async () => {
    prismaMock.listingView.count.mockResolvedValue(0);
    prismaMock.$queryRaw.mockResolvedValue([]);
    prismaMock.listingView.groupBy.mockResolvedValue([]);
    prismaMock.enquiry.groupBy.mockResolvedValue([]);
    prismaMock.lead.groupBy.mockResolvedValue([]);
    prismaMock.lead.count.mockResolvedValue(0);
    prismaMock.rfqInvite.groupBy.mockResolvedValue([]);
    prismaMock.quotation.groupBy.mockResolvedValue([]);
    prismaMock.order.aggregate.mockResolvedValue({
      _count: { _all: 0 },
      _sum: { totalInr: null },
    });
    const res = await service.getAnalytics('u');
    expect(res.leads.winRate).toBeNull();
    expect(res.rfq.responseRate).toBeNull();
    expect(res.orders.gmvInr).toBe(0);
  });

  it('merges KYC and listing audit events newest first', async () => {
    prismaMock.verificationAuditLog.findMany.mockResolvedValue([
      {
        id: 'k1',
        fromStatus: 'SUBMITTED',
        toStatus: 'APPROVED',
        note: null,
        createdAt: new Date('2026-01-02T00:00:00Z'),
      },
    ]);
    prismaMock.listingModerationAuditLog.findMany.mockResolvedValue([
      {
        id: 'm1',
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'APPROVED',
        note: 'ok',
        createdAt: new Date('2026-01-03T00:00:00Z'),
        listing: { id: 'l-1', name: 'X10' },
      },
    ]);
    const res = await service.getAuditLog('u');
    expect(res.items.map((i) => i.id)).toEqual(['m1', 'k1']);
    expect(res.items[0]).toMatchObject({ kind: 'LISTING', listingName: 'X10' });
  });

  it('services hub aggregates per-listing performance', async () => {
    prismaMock.partnerListing.findMany.mockResolvedValue([
      {
        id: 's1',
        name: 'Repair',
        category: 'REPAIR_MAINTENANCE',
        reviewStatus: 'APPROVED',
        isPublished: true,
        rejectionReason: null,
        priceOnRequest: true,
        priceInr: null,
        city: null,
        state: null,
        updatedAt: new Date(),
      },
    ]);
    prismaMock.listingView.groupBy.mockResolvedValue([
      { listingId: 's1', _count: { _all: 9 } },
    ]);
    prismaMock.lead.groupBy.mockResolvedValue([
      { listingId: 's1', _count: { _all: 2 } },
    ]);
    prismaMock.lead.count.mockResolvedValueOnce(5).mockResolvedValueOnce(1);
    prismaMock.lead.findMany.mockResolvedValue([]);

    const res = await service.getServicesHub('u');

    expect(res.total).toBe(1);
    expect(res.live).toBe(1);
    expect(res.items[0]).toMatchObject({ views30d: 9, leadCount: 2 });
    expect(res.serviceLeads).toEqual({ total: 5, new: 1 });
    expect(res.summary.APPROVED).toBe(1);
  });
});
