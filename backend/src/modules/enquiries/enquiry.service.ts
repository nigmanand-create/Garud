import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  EnquiryIntent,
  EnquiryStatus,
  LeadStatus,
  Prisma,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CrmWebhookService } from '../integrations/crm-webhook.service';
import { NotificationService } from '../notifications/notification.service';
import {
  CATEGORY_INTENT,
  CATEGORY_SERVICE_KEY,
  categoryForServiceKey,
  formatDetailsForMessage,
  intentForServiceKey,
  sanitizeDetails,
} from '../service-requests/service-request.rules';
import { ServiceRequestsService } from '../service-requests/service-requests.service';
import { CreateServiceRequestDto } from '../service-requests/dto/service-request.dto';
import {
  AssignEnquiryDto,
  BulkEnquiryStatusDto,
  CreateEnquiryDto,
  UpdateEnquiryStatusDto,
} from './dto/enquiry.dto';

export type ListEnquiriesParams = {
  status?: EnquiryStatus;
  intent?: EnquiryIntent;
  routing?: 'ROUTED' | 'UNROUTED';
  organizationId?: string;
  skip?: number;
  take?: number;
};

const ORG_SUMMARY = {
  select: {
    id: true,
    companyName: true,
    contactEmail: true,
    ownerId: true,
    verificationStatus: true,
  },
} as const;

type RoutingTarget = {
  organizationId: string;
  listingId: string | null;
  partnerEmail: string;
  partnerCompanyName: string;
  partnerUserId: string | null;
};

@Injectable()
export class EnquiryService {
  private readonly logger = new Logger(EnquiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    @Optional() private readonly crmWebhook?: CrmWebhookService,
    @Optional() private readonly serviceRequests?: ServiceRequestsService,
  ) {}

  private crmPayload(
    enquiry: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      subject: string;
      message: string;
      sourcePage: string | null;
      intent: EnquiryIntent;
      serviceKey: string | null;
      status: EnquiryStatus;
      listingId: string | null;
      organizationId: string | null;
      createdAt: Date;
    },
    partnerCompanyName?: string | null,
  ) {
    return {
      id: enquiry.id,
      name: enquiry.name,
      email: enquiry.email,
      phone: enquiry.phone,
      subject: enquiry.subject,
      message: enquiry.message,
      sourcePage: enquiry.sourcePage,
      intent: enquiry.intent,
      serviceKey: enquiry.serviceKey,
      status: enquiry.status,
      createdAt: enquiry.createdAt.toISOString(),
      routing: enquiry.organizationId
        ? {
            organizationId: enquiry.organizationId,
            companyName: partnerCompanyName ?? null,
            listingId: enquiry.listingId,
          }
        : null,
    };
  }

  /**
   * Routing rules (first match wins):
   * 1. `listingId` → vendor of an approved, published listing (verified org only)
   * 2. `organizationId` → verified partner organization
   * 3. otherwise unrouted → admin triage queue (services, general contact, demo w/o listing)
   */
  private async resolveRouting(
    dto: CreateEnquiryDto,
  ): Promise<RoutingTarget | null> {
    if (dto.listingId) {
      const listing = await this.prisma.partnerListing.findUnique({
        where: { id: dto.listingId },
        select: {
          id: true,
          isPublished: true,
          reviewStatus: true,
          organization: ORG_SUMMARY,
        },
      });
      if (
        listing &&
        listing.isPublished &&
        listing.reviewStatus === 'APPROVED' &&
        listing.organization.verificationStatus === VerificationStatus.APPROVED
      ) {
        return {
          organizationId: listing.organization.id,
          listingId: listing.id,
          partnerEmail: listing.organization.contactEmail,
          partnerCompanyName: listing.organization.companyName,
          partnerUserId: listing.organization.ownerId ?? null,
        };
      }
      this.logger.warn(
        `Enquiry listing context ${dto.listingId} is not routable; falling back to admin queue`,
      );
    }

    if (dto.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
        select: ORG_SUMMARY.select,
      });
      if (org && org.verificationStatus === VerificationStatus.APPROVED) {
        return {
          organizationId: org.id,
          listingId: null,
          partnerEmail: org.contactEmail,
          partnerCompanyName: org.companyName,
          partnerUserId: org.ownerId ?? null,
        };
      }
      this.logger.warn(
        `Enquiry partner context ${dto.organizationId} is not routable; falling back to admin queue`,
      );
    }

    return null;
  }

  private inferIntent(
    dto: CreateEnquiryDto,
    target: RoutingTarget | null,
  ): EnquiryIntent {
    if (dto.intent) return dto.intent;
    // Vertical lead types (REPAIR / FINANCE / SCRAP / TRAINING / TENDER) win over the
    // generic partner / product inference so the pipeline can be filtered by vertical.
    const vertical = intentForServiceKey(dto.serviceKey);
    if (vertical && !target?.listingId) return vertical;
    if (dto.serviceKey && !target) return EnquiryIntent.SERVICE;
    if (target?.listingId) return EnquiryIntent.PRODUCT;
    if (target) return EnquiryIntent.PARTNER;
    return EnquiryIntent.GENERAL;
  }

  async create(dto: CreateEnquiryDto) {
    return this.createInternal(dto);
  }

  /**
   * Public service-vertical intake (`POST /service-requests`): creates the enquiry (admin queue,
   * CRM, ack email, vertical lead type) plus the linked, matched `ServiceRequest`.
   */
  async submitServiceRequest(
    dto: CreateServiceRequestDto,
    buyerUserId?: string | null,
  ) {
    if (!this.serviceRequests) {
      throw new BadRequestException('Service matching is not available');
    }
    const details = sanitizeDetails(dto.details);
    const detailLines = formatDetailsForMessage(details);
    const message = [
      dto.description.trim(),
      detailLines ? `\n---\n${detailLines}` : '',
      dto.state || dto.city
        ? `\nLocation: ${[dto.city, dto.state].filter(Boolean).join(', ')}`
        : '',
    ].join('');
    const serviceKey = CATEGORY_SERVICE_KEY[dto.category];
    const enquiry = await this.createInternal(
      {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        subject: dto.title,
        message: message.slice(0, 5000),
        sourcePage: `/services/request?category=${dto.category}`,
        intent: CATEGORY_INTENT[dto.category],
        serviceKey,
      },
      { skipAutoServiceRequest: true },
    );
    const request = await this.serviceRequests.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      category: dto.category,
      title: dto.title,
      description: dto.description,
      state: dto.state,
      city: dto.city,
      details,
      buyerUserId: buyerUserId ?? null,
      enquiryId: enquiry.id,
    });
    return {
      enquiryId: enquiry.id,
      request: {
        id: request.id,
        status: request.status,
        trackingToken: request.trackingToken,
      },
    };
  }

  private async createInternal(
    dto: CreateEnquiryDto,
    opts: { skipAutoServiceRequest?: boolean } = {},
  ) {
    const target = await this.resolveRouting(dto);
    const intent = this.inferIntent(dto, target);

    const enquiry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.enquiry.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          phone: dto.phone?.trim() || null,
          subject: dto.subject.trim(),
          message: dto.message.trim(),
          sourcePage: dto.sourcePage?.trim() || null,
          intent,
          serviceKey: dto.serviceKey?.trim().toLowerCase() || null,
          listingId: target?.listingId ?? null,
          organizationId: target?.organizationId ?? null,
          routedAt: target ? new Date() : null,
        },
      });
      if (target) {
        await tx.lead.create({
          data: {
            organizationId: target.organizationId,
            enquiryId: created.id,
            listingId: target.listingId,
            intent,
          },
        });
      }
      return created;
    });

    void this.notifications.notifyEnquiryCreated({
      id: enquiry.id,
      name: enquiry.name,
      email: enquiry.email,
      phone: enquiry.phone,
      subject: enquiry.subject,
      message: enquiry.message,
      sourcePage: enquiry.sourcePage,
      intent: enquiry.intent,
      partnerEmail: target?.partnerEmail ?? null,
      partnerCompanyName: target?.partnerCompanyName ?? null,
      partnerUserId: target?.partnerUserId ?? null,
    });
    this.crmWebhook?.emit(
      'enquiry.created',
      this.crmPayload(enquiry, target?.partnerCompanyName),
    );

    // Phase 1 service-vertical enquiries (no explicit partner/listing) also enter matching.
    const category = categoryForServiceKey(enquiry.serviceKey);
    if (
      !target &&
      category &&
      this.serviceRequests &&
      !opts.skipAutoServiceRequest
    ) {
      try {
        await this.serviceRequests.create({
          name: enquiry.name,
          email: enquiry.email,
          phone: enquiry.phone,
          category,
          title: enquiry.subject,
          description: enquiry.message,
          enquiryId: enquiry.id,
        });
      } catch (error) {
        this.logger.error(
          `Auto service request for enquiry ${enquiry.id} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return enquiry;
  }

  async listForAdmin(params: ListEnquiriesParams = {}) {
    const take = Math.min(Math.max(params.take ?? 50, 1), 100);
    const skip = Math.max(params.skip ?? 0, 0);
    const where: Prisma.EnquiryWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.intent ? { intent: params.intent } : {}),
      ...(params.organizationId
        ? { organizationId: params.organizationId }
        : params.routing === 'ROUTED'
          ? { organizationId: { not: null } }
          : params.routing === 'UNROUTED'
            ? { organizationId: null }
            : {}),
    };

    const [items, total, statusGroups, unroutedNew] = await Promise.all([
      this.prisma.enquiry.findMany({
        where,
        include: {
          organization: { select: { id: true, companyName: true } },
          listing: { select: { id: true, name: true } },
          lead: { select: { id: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.enquiry.count({ where }),
      this.prisma.enquiry.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.enquiry.count({
        where: { status: EnquiryStatus.NEW, organizationId: null },
      }),
    ]);

    const statusCounts: Record<EnquiryStatus, number> = {
      NEW: 0,
      READ: 0,
      CLOSED: 0,
    };
    for (const g of statusGroups) {
      statusCounts[g.status] = g._count._all;
    }

    return { items, total, skip, take, statusCounts, unroutedNew };
  }

  async updateStatus(id: string, dto: UpdateEnquiryStatusDto) {
    try {
      return await this.prisma.enquiry.update({
        where: { id },
        data: { status: dto.status },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Enquiry not found');
      }
      throw e;
    }
  }

  async bulkUpdateStatus(dto: BulkEnquiryStatusDto) {
    const result = await this.prisma.enquiry.updateMany({
      where: { id: { in: dto.ids } },
      data: { status: dto.status },
    });
    return { updated: result.count };
  }

  /** Admin routing: assign to a verified partner, or pass null to return to the queue. */
  async assign(id: string, adminUserId: string, dto: AssignEnquiryDto) {
    const enquiry = await this.prisma.enquiry.findUnique({ where: { id } });
    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }

    const organizationId = dto.organizationId ?? null;

    if (!organizationId) {
      return this.prisma.$transaction(async (tx) => {
        await tx.lead.deleteMany({ where: { enquiryId: id } });
        return tx.enquiry.update({
          where: { id },
          data: { organizationId: null, routedAt: null, routedByUserId: null },
        });
      });
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: ORG_SUMMARY.select,
    });
    if (!org) {
      throw new NotFoundException('Partner organization not found');
    }
    if (org.verificationStatus !== VerificationStatus.APPROVED) {
      throw new BadRequestException(
        'Enquiries can only be routed to verified partners',
      );
    }

    const changed = enquiry.organizationId !== organizationId;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.enquiry.update({
        where: { id },
        data: {
          organizationId,
          routedAt: new Date(),
          routedByUserId: adminUserId,
        },
      });
      await tx.lead.upsert({
        where: { enquiryId: id },
        create: {
          organizationId,
          enquiryId: id,
          listingId: enquiry.listingId,
          intent: enquiry.intent,
        },
        update: changed
          ? {
              organizationId,
              status: LeadStatus.NEW,
              contactedAt: null,
              partnerNote: null,
            }
          : {},
      });
      return row;
    });

    if (changed) {
      void this.notifications.notifyEnquiryRouted({
        enquiry: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          subject: updated.subject,
          message: updated.message,
          sourcePage: updated.sourcePage,
          intent: updated.intent,
        },
        partnerEmail: org.contactEmail,
        partnerCompanyName: org.companyName,
        partnerUserId: org.ownerId ?? null,
      });
      this.crmWebhook?.emit(
        'enquiry.routed',
        this.crmPayload(updated, org.companyName),
      );
    }

    return updated;
  }

  private async requirePartnerOrgId(userId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!org) {
      throw new NotFoundException('Partner organization not found');
    }
    return org.id;
  }

  /** Partner inbox: enquiries routed to the partner's organization. */
  async listForPartner(
    userId: string,
    params: {
      status?: EnquiryStatus;
      q?: string;
      skip?: number;
      take?: number;
    } = {},
  ) {
    const organizationId = await this.requirePartnerOrgId(userId);
    const take = Math.min(Math.max(params.take ?? 50, 1), 100);
    const skip = Math.max(params.skip ?? 0, 0);
    const q = params.q?.trim();
    const where: Prisma.EnquiryWhereInput = {
      organizationId,
      ...(params.status ? { status: params.status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { subject: { contains: q, mode: 'insensitive' } },
              { message: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total, groups] = await Promise.all([
      this.prisma.enquiry.findMany({
        where,
        include: {
          listing: { select: { id: true, name: true } },
          lead: { select: { id: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.enquiry.count({ where }),
      this.prisma.enquiry.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<EnquiryStatus, number> = {
      NEW: 0,
      READ: 0,
      CLOSED: 0,
    };
    for (const g of groups) {
      statusCounts[g.status] = g._count._all;
    }
    return { items, total, skip, take, statusCounts };
  }

  async updateStatusForPartner(
    userId: string,
    id: string,
    dto: UpdateEnquiryStatusDto,
  ) {
    const organizationId = await this.requirePartnerOrgId(userId);
    const enquiry = await this.prisma.enquiry.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!enquiry) {
      throw new NotFoundException('Enquiry not found');
    }
    return this.prisma.enquiry.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
