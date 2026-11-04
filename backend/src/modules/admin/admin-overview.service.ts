import { Injectable } from '@nestjs/common';
import {
  EnquiryStatus,
  LeadStatus,
  ListingReviewStatus,
  PartnershipRequestStatus,
  PaymentStatus,
  Prisma,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';

/** A NEW lead untouched by the partner for this long is flagged as stale. */
export const STALE_LEAD_DAYS = 3;

/** Operations home: one narrative over KYC, listings, enquiries, leads, partnerships, orders. */
@Injectable()
export class AdminOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async overview(now: Date = new Date()) {
    const staleBefore = new Date(
      now.getTime() - STALE_LEAD_DAYS * 24 * 60 * 60 * 1000,
    );

    const [
      kycGroups,
      listingsPending,
      enquiryGroups,
      enquiriesNewUnrouted,
      leadGroups,
      leadsStale,
      partnershipGroups,
      ordersPaymentPending,
      activeAdmins,
      recentActivity,
    ] = await Promise.all([
      this.prisma.organization.groupBy({
        by: ['verificationStatus'],
        _count: { _all: true },
      }),
      this.prisma.partnerListing.count({
        where: { reviewStatus: ListingReviewStatus.PENDING_REVIEW },
      }),
      this.prisma.enquiry.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.enquiry.count({
        where: { status: EnquiryStatus.NEW, organizationId: null },
      }),
      this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.lead.count({
        where: { status: LeadStatus.NEW, createdAt: { lt: staleBefore } },
      }),
      this.prisma.partnershipRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.order.count({
        where: { paymentStatus: PaymentStatus.PENDING },
      }),
      this.prisma.user.count({
        where: { role: UserRole.PLATFORM_ADMIN, disabledAt: null },
      }),
      this.audit.recent(6),
    ]);

    const kyc = countBy(kycGroups, 'verificationStatus');
    const enquiries = countBy(enquiryGroups, 'status');
    const leads = countBy(leadGroups, 'status');
    const partnerships = countBy(partnershipGroups, 'status');

    const queues = {
      kyc: {
        pending:
          (kyc[VerificationStatus.SUBMITTED] ?? 0) +
          (kyc[VerificationStatus.UNDER_REVIEW] ?? 0),
        submitted: kyc[VerificationStatus.SUBMITTED] ?? 0,
        underReview: kyc[VerificationStatus.UNDER_REVIEW] ?? 0,
      },
      listings: { pendingReview: listingsPending },
      enquiries: {
        new: enquiries[EnquiryStatus.NEW] ?? 0,
        newUnrouted: enquiriesNewUnrouted,
        total: sum(enquiries),
      },
      leads: {
        new: leads[LeadStatus.NEW] ?? 0,
        stale: leadsStale,
        staleAfterDays: STALE_LEAD_DAYS,
        total: sum(leads),
        byStatus: leads,
      },
      partnerships: {
        pending:
          (partnerships[PartnershipRequestStatus.SUBMITTED] ?? 0) +
          (partnerships[PartnershipRequestStatus.UNDER_REVIEW] ?? 0),
        submitted: partnerships[PartnershipRequestStatus.SUBMITTED] ?? 0,
        underReview: partnerships[PartnershipRequestStatus.UNDER_REVIEW] ?? 0,
      },
      orders: { paymentPending: ordersPaymentPending },
      admins: { active: activeAdmins },
    };

    return {
      queues,
      /** Items needing a human right now (drives the dashboard badge). */
      attentionTotal:
        queues.kyc.pending +
        queues.listings.pendingReview +
        queues.enquiries.new +
        queues.partnerships.pending +
        queues.leads.stale,
      recentActivity,
    };
  }

  async listLeads(params: {
    status?: LeadStatus;
    organizationId?: string;
    stale?: boolean;
    skip?: number;
    take?: number;
  }) {
    const take = Math.min(Math.max(params.take ?? 25, 1), 100);
    const skip = Math.max(params.skip ?? 0, 0);
    const staleBefore = new Date(
      Date.now() - STALE_LEAD_DAYS * 24 * 60 * 60 * 1000,
    );
    const where: Prisma.LeadWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.organizationId
        ? { organizationId: params.organizationId }
        : {}),
      ...(params.stale
        ? { status: LeadStatus.NEW, createdAt: { lt: staleBefore } }
        : {}),
    };

    const [items, total, groups] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          organization: { select: { id: true, companyName: true } },
          enquiry: {
            select: {
              id: true,
              name: true,
              email: true,
              subject: true,
              intent: true,
            },
          },
          listing: { select: { id: true, name: true } },
        },
      }),
      this.prisma.lead.count({ where }),
      this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const statusCounts = Object.fromEntries(
      Object.values(LeadStatus).map((s) => [s, 0]),
    ) as Record<LeadStatus, number>;
    for (const g of groups) statusCounts[g.status] = g._count._all;

    return { items, total, skip, take, statusCounts };
  }
}

function countBy<K extends string>(
  groups: ({ _count: { _all: number } } & Record<K, string>)[],
  key: K,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of groups) out[g[key]] = g._count._all;
  return out;
}

function sum(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}
