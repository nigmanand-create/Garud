import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CatalogCategory,
  FulfillmentStatus,
  ListingReviewStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  ApproveListingDto,
  RejectApplicationDto,
  RejectListingDto,
  UnpublishListingDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  listApplications(status?: VerificationStatus) {
    return this.prisma.organization.findMany({
      where: status ? { verificationStatus: status } : undefined,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            role: true,
            accountType: true,
            createdAt: true,
          },
        },
        _count: { select: { documents: true, listings: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getApplication(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            role: true,
            accountType: true,
            createdAt: true,
          },
        },
        documents: { orderBy: { createdAt: 'desc' } },
        _count: { select: { listings: true } },
      },
    });
    if (!org) {
      throw new NotFoundException('Application not found');
    }
    return org;
  }

  async approveApplication(orgId: string, adminUserId: string) {
    return this.transition(
      orgId,
      adminUserId,
      [VerificationStatus.SUBMITTED, VerificationStatus.UNDER_REVIEW],
      VerificationStatus.APPROVED,
      'Approved by platform admin',
    );
  }

  async rejectApplication(
    orgId: string,
    adminUserId: string,
    dto: RejectApplicationDto,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Application not found');
    }
    if (
      org.verificationStatus !== VerificationStatus.SUBMITTED &&
      org.verificationStatus !== VerificationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('Application is not pending review');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: orgId },
        data: {
          verificationStatus: VerificationStatus.REJECTED,
          rejectionReason: dto.reason,
          reviewedAt: new Date(),
        },
      });
      await tx.verificationAuditLog.create({
        data: {
          organizationId: orgId,
          actorUserId: adminUserId,
          fromStatus: org.verificationStatus,
          toStatus: VerificationStatus.REJECTED,
          note: dto.note ?? dto.reason,
        },
      });
      return updated;
    });
  }

  private async transition(
    orgId: string,
    adminUserId: string,
    allowedFrom: VerificationStatus[],
    toStatus: VerificationStatus,
    note: string,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Application not found');
    }
    if (!allowedFrom.includes(org.verificationStatus)) {
      throw new BadRequestException('Application is not pending review');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: orgId },
        data: {
          verificationStatus: toStatus,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });
      await tx.verificationAuditLog.create({
        data: {
          organizationId: orgId,
          actorUserId: adminUserId,
          fromStatus: org.verificationStatus,
          toStatus,
          note,
        },
      });
      return updated;
    });
  }

  async listListings(query: {
    status?: ListingReviewStatus;
    category?: CatalogCategory;
    skip?: number;
    take?: number;
  }) {
    const take = Math.min(query.take ?? 20, 100);
    const skip = query.skip ?? 0;
    const where: Prisma.PartnerListingWhereInput = {
      reviewStatus: query.status,
      category: query.category,
    };

    const [items, total, statusGroups] = await Promise.all([
      this.prisma.partnerListing.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              companyName: true,
              contactPersonName: true,
              contactEmail: true,
              contactMobile: true,
              city: true,
              state: true,
              country: true,
              verificationStatus: true,
            },
          },
        },
        orderBy: [{ submittedForReviewAt: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.partnerListing.count({ where }),
      this.prisma.partnerListing.groupBy({
        by: ['reviewStatus'],
        where: query.category ? { category: query.category } : undefined,
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      PENDING_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      UNPUBLISHED: 0,
      DRAFT: 0,
      ALL: 0,
    };
    for (const g of statusGroups) {
      statusCounts[g.reviewStatus] = g._count._all;
      statusCounts.ALL += g._count._all;
    }

    return { items, total, skip, take, statusCounts };
  }

  async getListing(id: string) {
    const listing = await this.prisma.partnerListing.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                role: true,
                accountType: true,
              },
            },
          },
        },
        moderationLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  async approveListing(
    listingId: string,
    adminUserId: string,
    dto?: ApproveListingDto,
  ) {
    const listing = await this.prisma.partnerListing.findUnique({
      where: { id: listingId },
      include: { organization: true },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (
      listing.organization.verificationStatus !== VerificationStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Seller organization must be verified first',
      );
    }
    if (
      listing.reviewStatus === ListingReviewStatus.APPROVED &&
      listing.isPublished
    ) {
      throw new BadRequestException(
        'Listing is already approved and published',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.partnerListing.update({
        where: { id: listingId },
        data: {
          reviewStatus: ListingReviewStatus.APPROVED,
          isPublished: true,
          reviewedAt: new Date(),
          reviewedByUserId: adminUserId,
          rejectionReason: null,
        },
      });

      await tx.listingModerationAuditLog.create({
        data: {
          listingId,
          actorUserId: adminUserId,
          fromStatus: listing.reviewStatus,
          toStatus: ListingReviewStatus.APPROVED,
          note: dto?.note ?? 'Approved by platform admin',
        },
      });

      return updated;
    });
  }

  async rejectListing(
    listingId: string,
    adminUserId: string,
    dto: RejectListingDto,
  ) {
    const listing = await this.prisma.partnerListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.partnerListing.update({
        where: { id: listingId },
        data: {
          reviewStatus: ListingReviewStatus.REJECTED,
          isPublished: false,
          rejectionReason: dto.reason,
          reviewedAt: new Date(),
          reviewedByUserId: adminUserId,
        },
      });

      await tx.listingModerationAuditLog.create({
        data: {
          listingId,
          actorUserId: adminUserId,
          fromStatus: listing.reviewStatus,
          toStatus: ListingReviewStatus.REJECTED,
          note: dto.note ?? dto.reason,
        },
      });

      return updated;
    });
  }

  async unpublishListing(
    listingId: string,
    adminUserId: string,
    dto: UnpublishListingDto,
  ) {
    const listing = await this.prisma.partnerListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.partnerListing.update({
        where: { id: listingId },
        data: {
          reviewStatus: ListingReviewStatus.UNPUBLISHED,
          isPublished: false,
          rejectionReason: dto.reason,
          reviewedAt: new Date(),
          reviewedByUserId: adminUserId,
        },
      });

      await tx.listingModerationAuditLog.create({
        data: {
          listingId,
          actorUserId: adminUserId,
          fromStatus: listing.reviewStatus,
          toStatus: ListingReviewStatus.UNPUBLISHED,
          note: dto.note ?? dto.reason,
        },
      });

      return updated;
    });
  }

  async listOrders(query: {
    status?: OrderStatus;
    fulfillmentStatus?: FulfillmentStatus;
    paymentStatus?: PaymentStatus;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const take = Math.min(query.take ?? 20, 100);
    const skip = query.skip ?? 0;
    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.fulfillmentStatus) {
      where.fulfillmentStatus = query.fulfillmentStatus;
    }
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { contactName: { contains: q, mode: 'insensitive' } },
        { purchaseOrderNumber: { contains: q, mode: 'insensitive' } },
        {
          vendorOrganization: {
            companyName: { contains: q, mode: 'insensitive' },
          },
        },
        {
          buyerOrganization: {
            companyName: { contains: q, mode: 'insensitive' },
          },
        },
      ];
    }

    const [
      items,
      total,
      allOrdersSummary,
      pendingFulfillmentCount,
      pendingPaymentCount,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          buyerUser: {
            select: { id: true, email: true },
          },
          buyerOrganization: {
            select: { id: true, companyName: true, city: true, state: true },
          },
          vendorOrganization: {
            select: { id: true, companyName: true, city: true, state: true },
          },
          _count: { select: { lineItems: true } },
        },
        orderBy: { placedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where: { status: OrderStatus.CONFIRMED },
        _sum: { totalInr: true },
        _count: { id: true },
      }),
      this.prisma.order.count({
        where: {
          fulfillmentStatus: FulfillmentStatus.PENDING,
          status: OrderStatus.CONFIRMED,
        },
      }),
      this.prisma.order.count({
        where: {
          paymentStatus: PaymentStatus.PENDING,
          status: OrderStatus.CONFIRMED,
        },
      }),
    ]);

    const totalGMV = allOrdersSummary._sum.totalInr
      ? Number(allOrdersSummary._sum.totalInr)
      : 0;
    const totalConfirmedOrders = allOrdersSummary._count.id;

    return {
      items: items.map((o) => ({
        id: o.id,
        status: o.status,
        fulfillmentStatus: o.fulfillmentStatus,
        paymentStatus: o.paymentStatus,
        subtotalInr: o.subtotalInr.toFixed(2),
        taxInr: o.taxInr.toFixed(2),
        shippingInr: o.shippingInr.toFixed(2),
        totalInr: o.totalInr.toFixed(2),
        companyName: o.companyName,
        contactName: o.contactName,
        contactPhone: o.contactPhone,
        purchaseOrderNumber: o.purchaseOrderNumber,
        placedAt: o.placedAt.toISOString(),
        buyerUser: o.buyerUser,
        buyerOrganization: o.buyerOrganization,
        vendorOrganization: o.vendorOrganization,
        lineItemCount: o._count.lineItems,
      })),
      total,
      skip,
      take,
      metrics: {
        totalGMV,
        totalConfirmedOrders,
        pendingFulfillmentCount,
        pendingPaymentCount,
      },
    };
  }

  async getOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyerUser: {
          select: { id: true, email: true, role: true, accountType: true },
        },
        buyerOrganization: {
          include: {
            owner: { select: { id: true, email: true } },
          },
        },
        vendorOrganization: {
          include: {
            owner: { select: { id: true, email: true } },
          },
        },
        lineItems: {
          include: {
            listing: {
              select: {
                id: true,
                name: true,
                brand: true,
                primaryImageUrl: true,
                category: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return {
      ...order,
      subtotalInr: order.subtotalInr.toFixed(2),
      taxInr: order.taxInr.toFixed(2),
      shippingInr: order.shippingInr.toFixed(2),
      totalInr: order.totalInr.toFixed(2),
      placedAt: order.placedAt.toISOString(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      transactions: order.transactions.map((t) => ({
        id: t.id,
        gateway: t.gateway,
        gatewayOrderId: t.gatewayOrderId,
        gatewayPaymentId: t.gatewayPaymentId,
        utrNumber: t.utrNumber,
        senderBankName: t.senderBankName,
        amountInr: t.amountInr.toFixed(2),
        currency: t.currency,
        status: t.status,
        paymentMethod: t.paymentMethod,
        failureReason: t.failureReason,
        metadata: t.metadata,
        createdAt: t.createdAt.toISOString(),
      })),
      lineItems: order.lineItems.map((li) => ({
        id: li.id,
        listingId: li.listingId,
        snapshotName: li.snapshotName,
        snapshotSku: li.snapshotSku,
        unitPriceInr: li.unitPriceInr.toFixed(2),
        quantity: li.quantity,
        lineTotalInr: li.lineTotalInr.toFixed(2),
        listing: li.listing,
      })),
    };
  }

  async cancelOrder(orderId: string, adminUserId: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }
    this.logger.log(
      `Order ${orderId} cancelled by admin ${adminUserId}. Reason: ${reason}`,
    );
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
      },
    });
  }

  async updateOrderPayment(
    orderId: string,
    adminUserId: string,
    paymentStatus: PaymentStatus,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.logger.log(
      `Order ${orderId} payment status updated to ${paymentStatus} by admin ${adminUserId}`,
    );
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus,
      },
    });
  }
}
