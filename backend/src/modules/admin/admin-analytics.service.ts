import { Injectable } from '@nestjs/common';
import {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  QuotationStatus,
  RfqStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

const DAY_MS = 86_400_000;
const MAX_TREND_ORDERS = 20_000;

export const ANALYTICS_MIN_DAYS = 7;
export const ANALYTICS_MAX_DAYS = 365;

export function clampAnalyticsDays(days?: number): number {
  if (!days || Number.isNaN(days)) return 30;
  return Math.min(
    Math.max(Math.floor(days), ANALYTICS_MIN_DAYS),
    ANALYTICS_MAX_DAYS,
  );
}

/** Percentage rounded to 1 decimal; 0 when the denominator is 0. */
export function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
}

/** Period-over-period change in %, null when there is no baseline to compare with. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export type TrendOrder = {
  placedAt: Date;
  totalInr: number;
  paymentStatus: PaymentStatus;
};

export type TrendPoint = {
  /** ISO date (UTC) of the bucket start. */
  date: string;
  orders: number;
  gmvInr: number;
  paidGmvInr: number;
};

/** Daily buckets for short windows, weekly for long ones (keeps charts readable). */
export function bucketDaysFor(days: number): 1 | 7 {
  return days <= 31 ? 1 : 7;
}

/** Zero-filled GMV trend between `from` and `to`; orders outside the window are ignored. */
export function buildGmvTrend(
  orders: TrendOrder[],
  from: Date,
  to: Date,
  bucketDays: number,
): TrendPoint[] {
  const start = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const size = bucketDays * DAY_MS;
  const count = Math.max(Math.ceil((to.getTime() - start) / size), 1);
  const points: TrendPoint[] = Array.from({ length: count }, (_, i) => ({
    date: new Date(start + i * size).toISOString().slice(0, 10),
    orders: 0,
    gmvInr: 0,
    paidGmvInr: 0,
  }));
  for (const o of orders) {
    const t = o.placedAt.getTime();
    if (t < start || t > to.getTime()) continue;
    const idx = Math.min(Math.floor((t - start) / size), count - 1);
    points[idx].orders += 1;
    points[idx].gmvInr += o.totalInr;
    if (o.paymentStatus === PaymentStatus.PAID) {
      points[idx].paidGmvInr += o.totalInr;
    }
  }
  for (const p of points) {
    p.gmvInr = Math.round(p.gmvInr * 100) / 100;
    p.paidGmvInr = Math.round(p.paidGmvInr * 100) / 100;
  }
  return points;
}

function num(v: { toString(): string } | null | undefined): number {
  return v == null ? 0 : Number(v.toString());
}

/** Admin commerce analytics: GMV trends, order mix and the RFQ → quote → order funnel. */
@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async commerceAnalytics(rawDays?: number, now: Date = new Date()) {
    const days = clampAnalyticsDays(rawDays);
    const from = new Date(now.getTime() - days * DAY_MS);
    const prevFrom = new Date(from.getTime() - days * DAY_MS);

    const inWindow = { gte: from, lte: now };
    const confirmed = { status: OrderStatus.CONFIRMED, placedAt: inWindow };

    const [
      current,
      previous,
      paid,
      cancelled,
      trendRows,
      paymentGroups,
      fulfillmentGroups,
      vendorGroups,
      rfqOrders,
      rfqCreated,
      rfqStatusGroups,
      rfqQuoted,
      rfqAccepted,
      rfqOrdered,
      invitesTotal,
      invitesQuoted,
      invitesDeclined,
      quotationsTotal,
      quotationsAccepted,
      rfqPrev,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: confirmed,
        _sum: { totalInr: true },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: {
          status: OrderStatus.CONFIRMED,
          placedAt: { gte: prevFrom, lt: from },
        },
        _sum: { totalInr: true },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: { ...confirmed, paymentStatus: PaymentStatus.PAID },
        _sum: { totalInr: true },
        _count: { _all: true },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.CANCELLED, placedAt: inWindow },
      }),
      this.prisma.order.findMany({
        where: confirmed,
        select: { placedAt: true, totalInr: true, paymentStatus: true },
        orderBy: { placedAt: 'asc' },
        take: MAX_TREND_ORDERS,
      }),
      this.prisma.order.groupBy({
        by: ['paymentStatus'],
        where: confirmed,
        _count: { _all: true },
        _sum: { totalInr: true },
      }),
      this.prisma.order.groupBy({
        by: ['fulfillmentStatus'],
        where: confirmed,
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ['vendorOrganizationId'],
        where: confirmed,
        _count: { _all: true },
        _sum: { totalInr: true },
        orderBy: { _sum: { totalInr: 'desc' } },
        take: 5,
      }),
      this.prisma.order.aggregate({
        where: { ...confirmed, rfqId: { not: null } },
        _sum: { totalInr: true },
        _count: { _all: true },
      }),
      this.prisma.rfq.count({ where: { createdAt: inWindow } }),
      this.prisma.rfq.groupBy({
        by: ['status'],
        where: { createdAt: inWindow },
        _count: { _all: true },
      }),
      this.prisma.rfq.count({
        where: {
          createdAt: inWindow,
          quotations: { some: { status: { not: QuotationStatus.WITHDRAWN } } },
        },
      }),
      this.prisma.rfq.count({
        where: {
          createdAt: inWindow,
          quotations: { some: { status: QuotationStatus.ACCEPTED } },
        },
      }),
      this.prisma.rfq.count({
        where: {
          createdAt: inWindow,
          orders: { some: { status: OrderStatus.CONFIRMED } },
        },
      }),
      this.prisma.rfqInvite.count({ where: { rfq: { createdAt: inWindow } } }),
      this.prisma.rfqInvite.count({
        where: { rfq: { createdAt: inWindow }, status: 'QUOTED' },
      }),
      this.prisma.rfqInvite.count({
        where: { rfq: { createdAt: inWindow }, status: 'DECLINED' },
      }),
      this.prisma.quotation.count({
        where: {
          rfq: { createdAt: inWindow },
          status: { not: QuotationStatus.WITHDRAWN },
        },
      }),
      this.prisma.quotation.count({
        where: {
          rfq: { createdAt: inWindow },
          status: QuotationStatus.ACCEPTED,
        },
      }),
      this.prisma.rfq.count({
        where: { createdAt: { gte: prevFrom, lt: from } },
      }),
    ]);

    const vendorIds = vendorGroups.map((g) => g.vendorOrganizationId);
    const vendors = vendorIds.length
      ? await this.prisma.organization.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, companyName: true },
        })
      : [];
    const vendorName = new Map(vendors.map((v) => [v.id, v.companyName]));

    const gmv = num(current._sum.totalInr);
    const prevGmv = num(previous._sum.totalInr);
    const orderCount = current._count._all;
    const rfqOrderCount = rfqOrders._count._all;
    const rfqOrderGmv = num(rfqOrders._sum.totalInr);

    const bucket = bucketDaysFor(days);
    const trend = buildGmvTrend(
      trendRows.map((o) => ({
        placedAt: o.placedAt,
        totalInr: num(o.totalInr),
        paymentStatus: o.paymentStatus,
      })),
      from,
      now,
      bucket,
    );

    const rfqByStatus = Object.fromEntries(
      Object.values(RfqStatus).map((s) => [s, 0]),
    ) as Record<RfqStatus, number>;
    for (const g of rfqStatusGroups) rfqByStatus[g.status] = g._count._all;

    const paymentBreakdown = Object.fromEntries(
      Object.values(PaymentStatus).map((s) => [s, { orders: 0, gmvInr: 0 }]),
    ) as Record<PaymentStatus, { orders: number; gmvInr: number }>;
    for (const g of paymentGroups) {
      paymentBreakdown[g.paymentStatus] = {
        orders: g._count._all,
        gmvInr: num(g._sum.totalInr),
      };
    }

    const fulfillmentBreakdown = Object.fromEntries(
      Object.values(FulfillmentStatus).map((s) => [s, 0]),
    ) as Record<FulfillmentStatus, number>;
    for (const g of fulfillmentGroups) {
      fulfillmentBreakdown[g.fulfillmentStatus] = g._count._all;
    }

    return {
      days,
      from: from.toISOString(),
      to: now.toISOString(),
      gmv: {
        totalInr: gmv,
        paidInr: num(paid._sum.totalInr),
        pendingInr: Math.round((gmv - num(paid._sum.totalInr)) * 100) / 100,
        previousPeriodInr: prevGmv,
        changePct: deltaPct(gmv, prevGmv),
        orders: orderCount,
        previousOrders: previous._count._all,
        ordersChangePct: deltaPct(orderCount, previous._count._all),
        avgOrderValueInr: orderCount
          ? Math.round((gmv / orderCount) * 100) / 100
          : 0,
        cancelledOrders: cancelled,
        cancellationRatePct: pct(cancelled, cancelled + orderCount),
      },
      trend: { bucketDays: bucket, points: trend },
      paymentBreakdown,
      fulfillmentBreakdown,
      sourceSplit: {
        rfq: { orders: rfqOrderCount, gmvInr: rfqOrderGmv },
        direct: {
          orders: orderCount - rfqOrderCount,
          gmvInr: Math.round((gmv - rfqOrderGmv) * 100) / 100,
        },
        rfqSharePct: pct(rfqOrderGmv, gmv),
      },
      topVendors: vendorGroups.map((g) => ({
        organizationId: g.vendorOrganizationId,
        companyName: vendorName.get(g.vendorOrganizationId) ?? 'Unknown vendor',
        orders: g._count._all,
        gmvInr: num(g._sum.totalInr),
        sharePct: pct(num(g._sum.totalInr), gmv),
      })),
      rfq: {
        created: rfqCreated,
        previousCreated: rfqPrev,
        createdChangePct: deltaPct(rfqCreated, rfqPrev),
        byStatus: rfqByStatus,
        funnel: [
          {
            key: 'created',
            label: 'RFQs created',
            count: rfqCreated,
            ratePct: 100,
          },
          {
            key: 'quoted',
            label: 'Received a quotation',
            count: rfqQuoted,
            ratePct: pct(rfqQuoted, rfqCreated),
          },
          {
            key: 'accepted',
            label: 'Quotation accepted',
            count: rfqAccepted,
            ratePct: pct(rfqAccepted, rfqCreated),
          },
          {
            key: 'ordered',
            label: 'Converted to order',
            count: rfqOrdered,
            ratePct: pct(rfqOrdered, rfqCreated),
          },
        ],
        invites: {
          total: invitesTotal,
          quoted: invitesQuoted,
          declined: invitesDeclined,
          responseRatePct: pct(invitesQuoted + invitesDeclined, invitesTotal),
          quoteRatePct: pct(invitesQuoted, invitesTotal),
        },
        quotations: {
          total: quotationsTotal,
          accepted: quotationsAccepted,
          avgPerRfq: rfqCreated
            ? Math.round((quotationsTotal / rfqCreated) * 10) / 10
            : 0,
          acceptanceRatePct: pct(quotationsAccepted, quotationsTotal),
        },
        ordersFromRfq: { orders: rfqOrderCount, gmvInr: rfqOrderGmv },
      },
      truncated: trendRows.length >= MAX_TREND_ORDERS,
    };
  }
}
