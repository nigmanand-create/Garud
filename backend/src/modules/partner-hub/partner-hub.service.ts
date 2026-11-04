import { Injectable, NotFoundException } from '@nestjs/common';
import {
  EnquiryStatus,
  FulfillmentStatus,
  LeadStatus,
  ListingReviewStatus,
  ListingType,
  MessageSenderSide,
  OrderStatus,
  PartnershipRequestStatus,
  RfqInviteStatus,
  RfqStatus,
  QuotationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { toCsv, type CsvColumn } from '../integrations/csv.util';

const DAY_MS = 86_400_000;

export function clampDays(days?: number): number {
  if (!days || Number.isNaN(days)) return 30;
  return Math.min(Math.max(Math.floor(days), 7), 90);
}

function emptyRecord<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

/** Partner dashboard aggregates: overview widgets, analytics, services hub, audit slice (plans live in PartnerBillingService). */
@Injectable()
export class PartnerHubService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireOrg(userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
      select: { id: true, companyName: true, verificationStatus: true },
    });
    if (!org) {
      throw new NotFoundException('Partner organization not found');
    }
    return org;
  }

  /** Threads whose latest message is from the buyer and newer than the partner's last read. */
  async countUnreadForPartner(orgId: string): Promise<number> {
    const rows = await this.prisma.conversation.findMany({
      where: {
        partnerOrganizationId: orgId,
        lastMessageSide: MessageSenderSide.BUYER,
      },
      select: { lastMessageAt: true, partnerLastReadAt: true },
      take: 500,
    });
    return rows.filter(
      (r) => !r.partnerLastReadAt || r.partnerLastReadAt < r.lastMessageAt,
    ).length;
  }

  async getOverview(userId: string) {
    const org = await this.requireOrg(userId);
    const orgId = org.id;
    const since30 = new Date(Date.now() - 30 * DAY_MS);

    const [
      rfqAwaitingQuote,
      rfqQuoted,
      ordersToFulfill,
      listingGroups,
      newLeads,
      newEnquiries,
      unreadMessages,
      pendingPartnerships,
      views30d,
    ] = await Promise.all([
      this.prisma.rfqInvite.count({
        where: {
          vendorOrganizationId: orgId,
          status: RfqInviteStatus.INVITED,
          rfq: { status: RfqStatus.OPEN },
        },
      }),
      this.prisma.rfqInvite.count({
        where: {
          vendorOrganizationId: orgId,
          status: RfqInviteStatus.QUOTED,
          rfq: { status: RfqStatus.OPEN },
        },
      }),
      this.prisma.order.count({
        where: {
          vendorOrganizationId: orgId,
          status: { not: OrderStatus.CANCELLED },
          fulfillmentStatus: {
            in: [FulfillmentStatus.PENDING, FulfillmentStatus.PROCESSING],
          },
        },
      }),
      this.prisma.partnerListing.groupBy({
        by: ['reviewStatus'],
        where: { organizationId: orgId },
        _count: { _all: true },
      }),
      this.prisma.lead.count({
        where: { organizationId: orgId, status: LeadStatus.NEW },
      }),
      this.prisma.enquiry.count({
        where: { organizationId: orgId, status: EnquiryStatus.NEW },
      }),
      this.countUnreadForPartner(orgId),
      this.prisma.partnershipRequest.count({
        where: {
          organizationId: orgId,
          status: {
            in: [
              PartnershipRequestStatus.SUBMITTED,
              PartnershipRequestStatus.UNDER_REVIEW,
            ],
          },
        },
      }),
      this.prisma.listingView.count({
        where: { organizationId: orgId, createdAt: { gte: since30 } },
      }),
    ]);

    const catalog = emptyRecord(Object.values(ListingReviewStatus));
    for (const g of listingGroups) {
      catalog[g.reviewStatus] = g._count._all;
    }

    return {
      companyName: org.companyName,
      verificationStatus: org.verificationStatus,
      rfq: { awaitingQuote: rfqAwaitingQuote, quoted: rfqQuoted },
      ordersToFulfill,
      catalog,
      newLeads,
      newEnquiries,
      unreadMessages,
      pendingPartnerships,
      views30d,
    };
  }

  async getAnalytics(userId: string, rawDays?: number) {
    const org = await this.requireOrg(userId);
    const orgId = org.id;
    const days = clampDays(rawDays);
    const since = new Date(Date.now() - days * DAY_MS);

    const [
      viewsTotal,
      viewsByDayRaw,
      topViewGroups,
      enquiryGroups,
      leadGroups,
      leadsInPeriod,
      inviteGroups,
      quotationGroups,
      orderAgg,
    ] = await Promise.all([
      this.prisma.listingView.count({
        where: { organizationId: orgId, createdAt: { gte: since } },
      }),
      this.prisma.$queryRaw<Array<{ day: Date; count: number }>>`
        SELECT date_trunc('day', "created_at") AS day, COUNT(*)::int AS count
        FROM "listing_views"
        WHERE "organization_id" = ${orgId} AND "created_at" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC`,
      this.prisma.listingView.groupBy({
        by: ['listingId'],
        where: { organizationId: orgId, createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { listingId: 'desc' } },
        take: 5,
      }),
      this.prisma.enquiry.groupBy({
        by: ['status'],
        where: { organizationId: orgId, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { _all: true },
      }),
      this.prisma.lead.count({
        where: { organizationId: orgId, createdAt: { gte: since } },
      }),
      this.prisma.rfqInvite.groupBy({
        by: ['status'],
        where: { vendorOrganizationId: orgId, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.quotation.groupBy({
        by: ['status'],
        where: { vendorOrganizationId: orgId, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: {
          vendorOrganizationId: orgId,
          status: { not: OrderStatus.CANCELLED },
          placedAt: { gte: since },
        },
        _count: { _all: true },
        _sum: { totalInr: true },
      }),
    ]);

    // Zero-fill the daily series so charts have a continuous axis.
    const byDay = new Map<string, number>();
    for (const row of viewsByDayRaw) {
      byDay.set(
        new Date(row.day).toISOString().slice(0, 10),
        Number(row.count),
      );
    }
    const viewsByDay: Array<{ date: string; count: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
      viewsByDay.push({ date, count: byDay.get(date) ?? 0 });
    }

    const topIds = topViewGroups.map((g) => g.listingId);
    const topListingRows = topIds.length
      ? await this.prisma.partnerListing.findMany({
          where: { id: { in: topIds }, organizationId: orgId },
          select: { id: true, name: true, listingType: true },
        })
      : [];
    const nameById = new Map(topListingRows.map((l) => [l.id, l]));
    const topListings = topViewGroups.map((g) => ({
      listingId: g.listingId,
      name: nameById.get(g.listingId)?.name ?? 'Removed listing',
      listingType: nameById.get(g.listingId)?.listingType ?? null,
      views: g._count._all,
    }));

    const enquiryStatus = emptyRecord(Object.values(EnquiryStatus));
    for (const g of enquiryGroups) enquiryStatus[g.status] = g._count._all;
    const enquiriesTotal = Object.values(enquiryStatus).reduce(
      (a, b) => a + b,
      0,
    );

    const leadStatus = emptyRecord(Object.values(LeadStatus));
    for (const g of leadGroups) leadStatus[g.status] = g._count._all;
    const leadsAllTime = Object.values(leadStatus).reduce((a, b) => a + b, 0);
    const closedLeads = leadStatus.WON + leadStatus.LOST;

    const invites = emptyRecord(Object.values(RfqInviteStatus));
    for (const g of inviteGroups) invites[g.status] = g._count._all;
    const invitesTotal = Object.values(invites).reduce((a, b) => a + b, 0);

    const quotations = emptyRecord(Object.values(QuotationStatus));
    for (const g of quotationGroups) quotations[g.status] = g._count._all;
    const decidedQuotes = quotations.ACCEPTED + quotations.REJECTED;

    return {
      periodDays: days,
      since: since.toISOString(),
      views: { total: viewsTotal, byDay: viewsByDay, topListings },
      enquiries: { total: enquiriesTotal, byStatus: enquiryStatus },
      leads: {
        newInPeriod: leadsInPeriod,
        allTime: leadsAllTime,
        byStatus: leadStatus,
        winRate: closedLeads > 0 ? leadStatus.WON / closedLeads : null,
      },
      rfq: {
        invites,
        invitesTotal,
        quotations,
        responseRate:
          invitesTotal > 0
            ? (invites.QUOTED + invites.DECLINED) / invitesTotal
            : null,
        acceptanceRate:
          decidedQuotes > 0 ? quotations.ACCEPTED / decidedQuotes : null,
      },
      orders: {
        count: orderAgg._count._all,
        gmvInr: Number(orderAgg._sum.totalInr ?? 0),
      },
    };
  }

  async exportAnalyticsCsv(userId: string, rawDays?: number) {
    const data = await this.getAnalytics(userId, rawDays);
    type Row = { section: string; key: string; value: string | number };
    const rows: Row[] = [
      { section: 'summary', key: 'period_days', value: data.periodDays },
      { section: 'summary', key: 'listing_views_total', value: data.views.total },
      { section: 'summary', key: 'enquiries_total', value: data.enquiries.total },
      { section: 'summary', key: 'leads_new_in_period', value: data.leads.newInPeriod },
      { section: 'summary', key: 'orders_count', value: data.orders.count },
      { section: 'summary', key: 'orders_gmv_inr', value: data.orders.gmvInr },
      { section: 'summary', key: 'rfq_invites_total', value: data.rfq.invitesTotal },
      ...data.views.byDay.map((d) => ({
        section: 'daily_views',
        key: d.date,
        value: d.count,
      })),
      ...data.views.topListings.map((l) => ({
        section: 'top_listing',
        key: l.name,
        value: l.views,
      })),
    ];
    const columns: CsvColumn<Row>[] = [
      { header: 'section', value: (r) => r.section },
      { header: 'key', value: (r) => r.key },
      { header: 'value', value: (r) => r.value },
    ];
    const stamp = new Date().toISOString().slice(0, 10);
    return {
      csv: toCsv(rows, columns),
      filename: `garudhub-partner-analytics-${stamp}.csv`,
    };
  }

  /** Services hub: service listings (ListingType.SERVICE) with performance + service-vertical leads. */
  async getServicesHub(userId: string) {
    const org = await this.requireOrg(userId);
    const orgId = org.id;

    const listings = await this.prisma.partnerListing.findMany({
      where: { organizationId: orgId, listingType: ListingType.SERVICE },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        category: true,
        reviewStatus: true,
        isPublished: true,
        rejectionReason: true,
        priceOnRequest: true,
        priceInr: true,
        city: true,
        state: true,
        updatedAt: true,
      },
    });
    const ids = listings.map((l) => l.id);

    const since = new Date(Date.now() - 30 * DAY_MS);
    const [viewGroups, leadGroups, serviceLeadsTotal, serviceLeadsNew, recent] =
      await Promise.all([
        ids.length
          ? this.prisma.listingView.groupBy({
              by: ['listingId'],
              where: { listingId: { in: ids }, createdAt: { gte: since } },
              _count: { _all: true },
            })
          : Promise.resolve([]),
        ids.length
          ? this.prisma.lead.groupBy({
              by: ['listingId'],
              where: { organizationId: orgId, listingId: { in: ids } },
              _count: { _all: true },
            })
          : Promise.resolve([]),
        this.prisma.lead.count({
          where: { organizationId: orgId, intent: 'SERVICE' },
        }),
        this.prisma.lead.count({
          where: { organizationId: orgId, intent: 'SERVICE', status: 'NEW' },
        }),
        this.prisma.lead.findMany({
          where: {
            organizationId: orgId,
            OR: [
              { intent: 'SERVICE' },
              { listing: { listingType: 'SERVICE' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            createdAt: true,
            enquiry: {
              select: { subject: true, name: true, serviceKey: true },
            },
            listing: { select: { id: true, name: true } },
          },
        }),
      ]);

    const views30 = new Map(
      viewGroups.map((g) => [g.listingId, g._count._all]),
    );
    const leadCounts = new Map(
      leadGroups.map((g) => [g.listingId as string, g._count._all]),
    );

    const items = listings.map((l) => ({
      ...l,
      priceInr: l.priceInr ? l.priceInr.toString() : null,
      views30d: views30.get(l.id) ?? 0,
      leadCount: leadCounts.get(l.id) ?? 0,
    }));

    const summary = emptyRecord(Object.values(ListingReviewStatus));
    for (const l of listings) summary[l.reviewStatus] += 1;

    return {
      total: listings.length,
      live: listings.filter((l) => l.isPublished).length,
      summary,
      categories: Array.from(new Set(listings.map((l) => l.category))),
      items,
      serviceLeads: { total: serviceLeadsTotal, new: serviceLeadsNew },
      recentLeads: recent,
    };
  }

  /** KYC + listing-moderation events for the partner's own organization. */
  async getAuditLog(userId: string, rawTake?: number) {
    const org = await this.requireOrg(userId);
    const take = Math.min(Math.max(rawTake ?? 50, 1), 100);

    const [kyc, listing] = await Promise.all([
      this.prisma.verificationAuditLog.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
        },
      }),
      this.prisma.listingModerationAuditLog.findMany({
        where: { listing: { organizationId: org.id } },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          listing: { select: { id: true, name: true } },
        },
      }),
    ]);

    const events = [
      ...kyc.map((e) => ({
        id: e.id,
        kind: 'KYC' as const,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        note: e.note,
        createdAt: e.createdAt,
        listingId: null as string | null,
        listingName: null as string | null,
      })),
      ...listing.map((e) => ({
        id: e.id,
        kind: 'LISTING' as const,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        note: e.note,
        createdAt: e.createdAt,
        listingId: e.listing.id,
        listingName: e.listing.name,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take);

    return { items: events };
  }
}
