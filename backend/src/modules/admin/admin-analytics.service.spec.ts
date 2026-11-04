import { Test } from '@nestjs/testing';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  AdminAnalyticsService,
  bucketDaysFor,
  buildGmvTrend,
  clampAnalyticsDays,
  deltaPct,
  pct,
} from './admin-analytics.service';

describe('analytics helpers', () => {
  it('clamps days', () => {
    expect(clampAnalyticsDays()).toBe(30);
    expect(clampAnalyticsDays(1)).toBe(7);
    expect(clampAnalyticsDays(9999)).toBe(365);
    expect(clampAnalyticsDays(90)).toBe(90);
  });

  it('computes rates and deltas safely', () => {
    expect(pct(1, 3)).toBe(33.3);
    expect(pct(1, 0)).toBe(0);
    expect(deltaPct(150, 100)).toBe(50);
    expect(deltaPct(50, 100)).toBe(-50);
    expect(deltaPct(10, 0)).toBeNull();
  });

  it('uses daily buckets up to a month and weekly beyond', () => {
    expect(bucketDaysFor(30)).toBe(1);
    expect(bucketDaysFor(31)).toBe(1);
    expect(bucketDaysFor(90)).toBe(7);
  });

  it('builds a zero-filled GMV trend', () => {
    const from = new Date('2026-01-01T10:00:00Z');
    const to = new Date('2026-01-07T10:00:00Z');
    const pts = buildGmvTrend(
      [
        {
          placedAt: new Date('2026-01-01T12:00:00Z'),
          totalInr: 1000,
          paymentStatus: PaymentStatus.PAID,
        },
        {
          placedAt: new Date('2026-01-01T13:00:00Z'),
          totalInr: 500,
          paymentStatus: PaymentStatus.PENDING,
        },
        {
          placedAt: new Date('2026-01-04T00:30:00Z'),
          totalInr: 200,
          paymentStatus: PaymentStatus.PAID,
        },
        {
          placedAt: new Date('2025-12-01T00:00:00Z'),
          totalInr: 999,
          paymentStatus: PaymentStatus.PAID,
        },
      ],
      from,
      to,
      1,
    );
    expect(pts[0]).toEqual({
      date: '2026-01-01',
      orders: 2,
      gmvInr: 1500,
      paidGmvInr: 1000,
    });
    expect(pts[1]).toEqual({
      date: '2026-01-02',
      orders: 0,
      gmvInr: 0,
      paidGmvInr: 0,
    });
    expect(pts[3]).toMatchObject({
      date: '2026-01-04',
      orders: 1,
      gmvInr: 200,
    });
    expect(pts.reduce((n, p) => n + p.orders, 0)).toBe(3);
  });

  it('aggregates weekly buckets', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-01-29T00:00:00Z');
    const pts = buildGmvTrend(
      [
        {
          placedAt: new Date('2026-01-03T00:00:00Z'),
          totalInr: 10,
          paymentStatus: PaymentStatus.PAID,
        },
        {
          placedAt: new Date('2026-01-10T00:00:00Z'),
          totalInr: 20,
          paymentStatus: PaymentStatus.PAID,
        },
      ],
      from,
      to,
      7,
    );
    expect(pts).toHaveLength(4);
    expect(pts.map((p) => p.gmvInr)).toEqual([10, 20, 0, 0]);
  });
});

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  const agg = (sum: number, count: number) => ({
    _sum: { totalInr: sum },
    _count: { _all: count },
  });
  const prisma = {
    order: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    rfq: { count: jest.fn(), groupBy: jest.fn() },
    rfqInvite: { count: jest.fn() },
    quotation: { count: jest.fn() },
    organization: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        AdminAnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = mod.get(AdminAnalyticsService);
  });

  it('assembles GMV, RFQ funnel and vendor ranking', async () => {
    // aggregate call order: current, previous, paid, rfq-orders
    prisma.order.aggregate
      .mockResolvedValueOnce(agg(10000, 4))
      .mockResolvedValueOnce(agg(5000, 2))
      .mockResolvedValueOnce(agg(6000, 2))
      .mockResolvedValueOnce(agg(4000, 1));
    prisma.order.count.mockResolvedValue(1);
    prisma.order.findMany.mockResolvedValue([
      {
        placedAt: new Date('2026-06-10T00:00:00Z'),
        totalInr: 10000,
        paymentStatus: 'PAID',
      },
    ]);
    prisma.order.groupBy
      .mockResolvedValueOnce([
        {
          paymentStatus: 'PAID',
          _count: { _all: 2 },
          _sum: { totalInr: 6000 },
        },
      ])
      .mockResolvedValueOnce([
        { fulfillmentStatus: 'PENDING', _count: { _all: 3 } },
      ])
      .mockResolvedValueOnce([
        {
          vendorOrganizationId: 'v1',
          _count: { _all: 3 },
          _sum: { totalInr: 7000 },
        },
      ]);
    prisma.organization.findMany.mockResolvedValue([
      { id: 'v1', companyName: 'Aero Co' },
    ]);
    // rfq.count order: created, quoted, accepted, ordered, previous
    prisma.rfq.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5);
    prisma.rfq.groupBy.mockResolvedValue([
      { status: 'OPEN', _count: { _all: 7 } },
    ]);
    // invites: total, quoted, declined
    prisma.rfqInvite.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(4);
    prisma.quotation.count.mockResolvedValueOnce(12).mockResolvedValueOnce(3);

    const res = await service.commerceAnalytics(
      30,
      new Date('2026-06-15T00:00:00Z'),
    );

    expect(res.gmv).toMatchObject({
      totalInr: 10000,
      paidInr: 6000,
      pendingInr: 4000,
      changePct: 100,
      orders: 4,
      avgOrderValueInr: 2500,
      cancelledOrders: 1,
      cancellationRatePct: 20,
    });
    expect(res.sourceSplit).toMatchObject({
      rfq: { orders: 1, gmvInr: 4000 },
      direct: { orders: 3, gmvInr: 6000 },
      rfqSharePct: 40,
    });
    expect(res.topVendors[0]).toMatchObject({
      companyName: 'Aero Co',
      gmvInr: 7000,
      sharePct: 70,
    });
    expect(res.rfq.funnel.map((f) => [f.key, f.count, f.ratePct])).toEqual([
      ['created', 10, 100],
      ['quoted', 6, 60],
      ['accepted', 3, 30],
      ['ordered', 2, 20],
    ]);
    expect(res.rfq.byStatus.OPEN).toBe(7);
    expect(res.rfq.createdChangePct).toBe(100);
    expect(res.rfq.invites).toMatchObject({
      responseRatePct: 60,
      quoteRatePct: 40,
    });
    expect(res.rfq.quotations).toMatchObject({
      avgPerRfq: 1.2,
      acceptanceRatePct: 25,
    });
    expect(res.trend.points.reduce((n, p) => n + p.orders, 0)).toBe(1);
    expect(res.paymentBreakdown.PAID).toEqual({ orders: 2, gmvInr: 6000 });
    expect(res.fulfillmentBreakdown.PENDING).toBe(3);
  });
});
