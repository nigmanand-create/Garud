import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ServiceMatchStatus,
  ServiceRequestCategory,
  ServiceRequestStatus,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import {
  AdminAssignServiceRequestDto,
  AdminServiceRequestStatusDto,
  PartnerServiceRequestUpdateDto,
  ServiceCoverageDto,
} from './dto/service-request.dto';
import {
  CATEGORY_CATALOG_CATEGORIES,
  CATEGORY_LABELS,
  canTransition,
  isTerminal,
  MatchCandidate,
  rankCandidates,
} from './service-request.rules';

export type CreateServiceRequestInput = {
  name: string;
  email: string;
  phone?: string | null;
  category: ServiceRequestCategory;
  title: string;
  description: string;
  state?: string | null;
  city?: string | null;
  details?: Record<string, string | number | boolean> | null;
  buyerUserId?: string | null;
  enquiryId?: string | null;
};

const ORG_BRIEF = {
  select: { id: true, companyName: true, contactEmail: true, ownerId: true },
} as const;

function location(r: { state?: string | null; city?: string | null }) {
  return [r.city, r.state].filter(Boolean).join(', ') || null;
}

@Injectable()
export class ServiceRequestsService {
  private readonly logger = new Logger(ServiceRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  // --- create + match ---------------------------------------------------------

  async create(input: CreateServiceRequestInput) {
    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceRequest.create({
        data: {
          trackingToken: randomBytes(18).toString('base64url'),
          buyerUserId: input.buyerUserId ?? null,
          enquiryId: input.enquiryId ?? null,
          requesterName: input.name.trim(),
          requesterEmail: input.email.trim().toLowerCase(),
          requesterPhone: input.phone?.trim() || null,
          category: input.category,
          title: input.title.trim(),
          description: input.description.trim(),
          state: input.state?.trim() || null,
          city: input.city?.trim() || null,
          details: input.details ?? undefined,
        },
      });
      await tx.serviceRequestUpdate.create({
        data: {
          requestId: created.id,
          actor: 'REQUESTER',
          status: ServiceRequestStatus.SUBMITTED,
          note: 'Request submitted',
        },
      });
      return created;
    });
    return this.match(request.id);
  }

  /** Find verified providers for the category + state and offer them the request. */
  async match(requestId: string, opts: { actor?: string } = {}) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { matches: { select: { organizationId: true } } },
    });
    if (!request) throw new NotFoundException('Service request not found');
    if (request.status !== ServiceRequestStatus.SUBMITTED) {
      return request;
    }

    const already = new Set(request.matches.map((m) => m.organizationId));
    const catalogCategories = CATEGORY_CATALOG_CATEGORIES[request.category];
    const orgs = await this.prisma.organization.findMany({
      where: {
        verificationStatus: VerificationStatus.APPROVED,
        owner: { role: 'PARTNER', disabledAt: null },
        id: { notIn: [...already] },
        OR: [
          { serviceCategories: { has: request.category } },
          ...(catalogCategories?.length
            ? [
                {
                  listings: {
                    some: {
                      listingType: 'SERVICE' as const,
                      reviewStatus: 'APPROVED' as const,
                      isPublished: true,
                      category: { in: catalogCategories },
                    },
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        state: true,
        serviceStates: true,
        serviceCategories: true,
        companyName: true,
        contactEmail: true,
        ownerId: true,
      },
    });

    const byId = new Map(orgs.map((o) => [o.id, o]));
    const candidates: MatchCandidate[] = orgs.map((o) => ({
      id: o.id,
      state: o.state,
      serviceStates: o.serviceStates,
      declaredCategory: o.serviceCategories.includes(request.category),
    }));
    const { scope, picked } = rankCandidates(candidates, request.state);

    if (picked.length === 0) {
      return this.prisma.$transaction(async (tx) => {
        await tx.serviceRequestUpdate.create({
          data: {
            requestId,
            actor: 'SYSTEM',
            note: 'No verified provider matched yet — the GarudHub team will assign one manually.',
          },
        });
        return tx.serviceRequest.update({
          where: { id: requestId },
          data: { matchScope: 'NONE' },
        });
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.serviceRequestMatch.createMany({
        data: picked.map((c) => ({ requestId, organizationId: c.id })),
        skipDuplicates: true,
      });
      await tx.serviceRequestUpdate.create({
        data: {
          requestId,
          actor: opts.actor ?? 'SYSTEM',
          status: ServiceRequestStatus.MATCHED,
          note: `Matched with ${picked.length} verified provider${picked.length > 1 ? 's' : ''} (${
            scope === 'STATE' ? 'in your state' : 'nationwide'
          })`,
        },
      });
      return tx.serviceRequest.update({
        where: { id: requestId },
        data: { status: ServiceRequestStatus.MATCHED, matchScope: scope },
      });
    });

    void this.notifications.notifyServiceRequestMatched({
      requestId,
      title: request.title,
      categoryLabel: CATEGORY_LABELS[request.category],
      location: location(request),
      recipients: picked.flatMap((c) => {
        const o = byId.get(c.id);
        return o
          ? [
              {
                email: o.contactEmail,
                companyName: o.companyName,
                userId: o.ownerId,
              },
            ]
          : [];
      }),
    });
    void this.notifications.notifyServiceRequestStatus({
      to: request.requesterEmail,
      name: request.requesterName,
      title: request.title,
      status: ServiceRequestStatus.MATCHED,
      trackingToken: request.trackingToken,
    });
    return updated;
  }

  // --- public tracking / requester ---------------------------------------------

  private publicView(
    r: Prisma.ServiceRequestGetPayload<{
      include: {
        assignedOrganization: { select: { companyName: true } };
        updates: true;
      };
    }>,
  ) {
    const connected =
      r.status === ServiceRequestStatus.IN_PROGRESS ||
      r.status === ServiceRequestStatus.COMPLETED;
    return {
      id: r.id,
      trackingToken: r.trackingToken,
      category: r.category,
      title: r.title,
      description: r.description,
      state: r.state,
      city: r.city,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      provider: connected
        ? (r.assignedOrganization?.companyName ?? null)
        : null,
      updates: r.updates.map((u) => ({
        id: u.id,
        actor: u.actor,
        status: u.status,
        note: u.note,
        createdAt: u.createdAt,
      })),
    };
  }

  private static readonly PUBLIC_INCLUDE = {
    assignedOrganization: { select: { companyName: true } },
    updates: { orderBy: { createdAt: 'asc' as const } },
  };

  async getByToken(token: string) {
    const r = await this.prisma.serviceRequest.findUnique({
      where: { trackingToken: token },
      include: ServiceRequestsService.PUBLIC_INCLUDE,
    });
    if (!r) throw new NotFoundException('Service request not found');
    return this.publicView(r);
  }

  async cancelByToken(token: string, reason?: string) {
    const r = await this.prisma.serviceRequest.findUnique({
      where: { trackingToken: token },
    });
    if (!r) throw new NotFoundException('Service request not found');
    await this.transition(r.id, r.status, ServiceRequestStatus.CANCELLED, {
      actor: 'REQUESTER',
      note: reason?.trim() || 'Cancelled by requester',
    });
    return this.getByToken(token);
  }

  async listForBuyer(userId: string) {
    const items = await this.prisma.serviceRequest.findMany({
      where: { buyerUserId: userId },
      include: ServiceRequestsService.PUBLIC_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { items: items.map((r) => this.publicView(r)) };
  }

  // --- shared transition helper -------------------------------------------------

  private async transition(
    id: string,
    from: ServiceRequestStatus,
    to: ServiceRequestStatus,
    meta: { actor: string; note?: string | null; notify?: boolean },
    extra: Prisma.ServiceRequestUncheckedUpdateManyInput = {},
  ) {
    if (!canTransition(from, to)) {
      throw new BadRequestException(
        `Cannot move a ${from.toLowerCase().replace('_', ' ')} request to ${to.toLowerCase().replace('_', ' ')}`,
      );
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      // Optimistic lock: only apply if nobody else changed the status meanwhile.
      const res = await tx.serviceRequest.updateMany({
        where: { id, status: from },
        data: {
          status: to,
          completedAt:
            to === ServiceRequestStatus.COMPLETED ? new Date() : undefined,
          ...extra,
        },
      });
      if (res.count !== 1) {
        throw new ConflictException('Request was updated by someone else');
      }
      if (to === ServiceRequestStatus.CANCELLED) {
        await tx.serviceRequestMatch.updateMany({
          where: { requestId: id, status: ServiceMatchStatus.OFFERED },
          data: { status: ServiceMatchStatus.WITHDRAWN },
        });
      }
      await tx.serviceRequestUpdate.create({
        data: {
          requestId: id,
          actor: meta.actor,
          status: to,
          note: meta.note ?? null,
        },
      });
      return tx.serviceRequest.findUniqueOrThrow({ where: { id } });
    });
    if (meta.notify !== false) {
      void this.notifications.notifyServiceRequestStatus({
        to: updated.requesterEmail,
        name: updated.requesterName,
        title: updated.title,
        status: to,
        trackingToken: updated.trackingToken,
        note: meta.note,
      });
    }
    return updated;
  }

  // --- partner ------------------------------------------------------------------

  private async requireOrg(userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
      select: {
        id: true,
        companyName: true,
        serviceCategories: true,
        serviceStates: true,
        state: true,
      },
    });
    if (!org) throw new NotFoundException('Partner organization not found');
    return org;
  }

  async getCoverage(userId: string) {
    const org = await this.requireOrg(userId);
    return {
      categories: org.serviceCategories,
      states: org.serviceStates,
      homeState: org.state,
    };
  }

  async updateCoverage(userId: string, dto: ServiceCoverageDto) {
    const org = await this.requireOrg(userId);
    const states = [
      ...new Set(dto.states.map((s) => s.trim()).filter(Boolean)),
    ];
    const categories = [...new Set(dto.categories)];
    await this.prisma.organization.update({
      where: { id: org.id },
      data: { serviceCategories: categories, serviceStates: states },
    });
    return { categories, states, homeState: org.state };
  }

  async listForPartner(
    userId: string,
    params: { tab?: 'OFFERED' | 'ACTIVE' | 'CLOSED' } = {},
  ) {
    const org = await this.requireOrg(userId);
    const base: Prisma.ServiceRequestMatchWhereInput = {
      organizationId: org.id,
    };
    const tabWhere: Record<string, Prisma.ServiceRequestMatchWhereInput> = {
      OFFERED: {
        status: ServiceMatchStatus.OFFERED,
        request: { status: ServiceRequestStatus.MATCHED },
      },
      ACTIVE: {
        status: ServiceMatchStatus.ACCEPTED,
        request: { status: ServiceRequestStatus.IN_PROGRESS },
      },
      CLOSED: {
        OR: [
          { status: ServiceMatchStatus.DECLINED },
          { status: ServiceMatchStatus.WITHDRAWN },
          {
            status: ServiceMatchStatus.ACCEPTED,
            request: {
              status: {
                in: [
                  ServiceRequestStatus.COMPLETED,
                  ServiceRequestStatus.CANCELLED,
                ],
              },
            },
          },
        ],
      },
    };

    const [rows, offered, active, closed] = await Promise.all([
      this.prisma.serviceRequestMatch.findMany({
        where: { ...base, ...(params.tab ? tabWhere[params.tab] : {}) },
        include: {
          request: { include: { updates: { orderBy: { createdAt: 'asc' } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.serviceRequestMatch.count({
        where: { ...base, ...tabWhere.OFFERED },
      }),
      this.prisma.serviceRequestMatch.count({
        where: { ...base, ...tabWhere.ACTIVE },
      }),
      this.prisma.serviceRequestMatch.count({
        where: { ...base, ...tabWhere.CLOSED },
      }),
    ]);

    const items = rows.map((m) => {
      const r = m.request;
      // Requester contact is revealed only once this partner has accepted (connected).
      const connected = m.status === ServiceMatchStatus.ACCEPTED;
      return {
        matchId: m.id,
        matchStatus: m.status,
        offeredAt: m.createdAt,
        request: {
          id: r.id,
          category: r.category,
          title: r.title,
          description: r.description,
          state: r.state,
          city: r.city,
          details: r.details,
          status: r.status,
          createdAt: r.createdAt,
          requesterName: connected ? r.requesterName : null,
          requesterEmail: connected ? r.requesterEmail : null,
          requesterPhone: connected ? r.requesterPhone : null,
          updates: connected
            ? r.updates.map((u) => ({
                id: u.id,
                actor: u.actor,
                status: u.status,
                note: u.note,
                createdAt: u.createdAt,
              }))
            : [],
        },
      };
    });
    return { items, counts: { offered, active, closed } };
  }

  async accept(userId: string, requestId: string) {
    const org = await this.requireOrg(userId);
    const match = await this.prisma.serviceRequestMatch.findUnique({
      where: {
        requestId_organizationId: { requestId, organizationId: org.id },
      },
      include: { request: true },
    });
    if (!match) throw new NotFoundException('Service request not found');
    if (match.status !== ServiceMatchStatus.OFFERED) {
      throw new BadRequestException('This request is no longer open to you');
    }
    if (match.request.status !== ServiceRequestStatus.MATCHED) {
      throw new ConflictException(
        'This request was already taken or is closed',
      );
    }

    const updated = await this.transition(
      requestId,
      ServiceRequestStatus.MATCHED,
      ServiceRequestStatus.IN_PROGRESS,
      { actor: 'PARTNER', note: `${org.companyName} accepted your request` },
      { assignedOrganizationId: org.id },
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceRequestMatch.update({
        where: { id: match.id },
        data: {
          status: ServiceMatchStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      });
      await tx.serviceRequestMatch.updateMany({
        where: {
          requestId,
          id: { not: match.id },
          status: ServiceMatchStatus.OFFERED,
        },
        data: { status: ServiceMatchStatus.WITHDRAWN },
      });
      // Connect → surface in the partner's Leads pipeline when an enquiry exists.
      if (updated.enquiryId) {
        const enquiry = await tx.enquiry.update({
          where: { id: updated.enquiryId },
          data: {
            organizationId: org.id,
            routedAt: new Date(),
          },
        });
        await tx.lead.upsert({
          where: { enquiryId: enquiry.id },
          create: {
            organizationId: org.id,
            enquiryId: enquiry.id,
            intent: enquiry.intent,
          },
          update: { organizationId: org.id },
        });
      }
    });
    return this.partnerRow(org.id, requestId);
  }

  async decline(userId: string, requestId: string) {
    const org = await this.requireOrg(userId);
    const match = await this.prisma.serviceRequestMatch.findUnique({
      where: {
        requestId_organizationId: { requestId, organizationId: org.id },
      },
      include: { request: true },
    });
    if (!match) throw new NotFoundException('Service request not found');
    if (match.status !== ServiceMatchStatus.OFFERED) {
      throw new BadRequestException('This request is no longer open to you');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceRequestMatch.update({
        where: { id: match.id },
        data: {
          status: ServiceMatchStatus.DECLINED,
          respondedAt: new Date(),
        },
      });
      const remaining = await tx.serviceRequestMatch.count({
        where: { requestId, status: ServiceMatchStatus.OFFERED },
      });
      if (
        remaining === 0 &&
        match.request.status === ServiceRequestStatus.MATCHED
      ) {
        await tx.serviceRequest.update({
          where: { id: requestId },
          data: { status: ServiceRequestStatus.SUBMITTED, matchScope: 'NONE' },
        });
        await tx.serviceRequestUpdate.create({
          data: {
            requestId,
            actor: 'SYSTEM',
            status: ServiceRequestStatus.SUBMITTED,
            note: 'All matched providers declined — re-routing to the GarudHub team.',
          },
        });
      }
    });
    return { declined: true };
  }

  async partnerUpdate(
    userId: string,
    requestId: string,
    dto: PartnerServiceRequestUpdateDto,
  ) {
    const org = await this.requireOrg(userId);
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Service request not found');
    if (request.assignedOrganizationId !== org.id) {
      throw new ForbiddenException('This request is not assigned to you');
    }
    if (!dto.status && !dto.note?.trim()) {
      throw new BadRequestException('Provide a status or a note');
    }
    if (dto.status && dto.status !== ServiceRequestStatus.COMPLETED) {
      throw new BadRequestException('Partners can only mark a job completed');
    }

    if (dto.status) {
      await this.transition(requestId, request.status, dto.status, {
        actor: 'PARTNER',
        note: dto.note?.trim() || null,
      });
    } else {
      if (isTerminal(request.status)) {
        throw new BadRequestException('This request is closed');
      }
      await this.prisma.serviceRequestUpdate.create({
        data: {
          requestId,
          actor: 'PARTNER',
          note: dto.note!.trim(),
        },
      });
    }
    return this.partnerRow(org.id, requestId);
  }

  private async partnerRow(organizationId: string, requestId: string) {
    const m = await this.prisma.serviceRequestMatch.findUniqueOrThrow({
      where: { requestId_organizationId: { requestId, organizationId } },
      include: {
        request: { include: { updates: { orderBy: { createdAt: 'asc' } } } },
      },
    });
    return { matchId: m.id, matchStatus: m.status, request: m.request };
  }

  // --- admin --------------------------------------------------------------------

  async listForAdmin(
    params: {
      status?: ServiceRequestStatus;
      category?: ServiceRequestCategory;
      q?: string;
      skip?: number;
      take?: number;
    } = {},
  ) {
    const take = Math.min(Math.max(params.take ?? 50, 1), 100);
    const skip = Math.max(params.skip ?? 0, 0);
    const q = params.q?.trim();
    const where: Prisma.ServiceRequestWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { requesterName: { contains: q, mode: 'insensitive' } },
              { requesterEmail: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total, groups] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        include: {
          assignedOrganization: { select: { id: true, companyName: true } },
          matches: {
            select: {
              status: true,
              organization: { select: { id: true, companyName: true } },
            },
          },
          updates: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.serviceRequest.count({ where }),
      this.prisma.serviceRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);
    const statusCounts: Record<ServiceRequestStatus, number> = {
      SUBMITTED: 0,
      MATCHED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const g of groups) statusCounts[g.status] = g._count._all;
    return { items, total, skip, take, statusCounts };
  }

  async adminRematch(requestId: string, adminUserId: string) {
    void adminUserId;
    return this.match(requestId, { actor: 'ADMIN' });
  }

  /** Offer the request to one specific verified provider (manual match). */
  async adminAssign(
    requestId: string,
    adminUserId: string,
    dto: AdminAssignServiceRequestDto,
  ) {
    void adminUserId;
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Service request not found');
    if (
      request.status !== ServiceRequestStatus.SUBMITTED &&
      request.status !== ServiceRequestStatus.MATCHED
    ) {
      throw new BadRequestException(
        'Only submitted or matched requests can be assigned',
      );
    }
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
      select: { ...ORG_BRIEF.select, verificationStatus: true },
    });
    if (!org) throw new NotFoundException('Partner organization not found');
    if (org.verificationStatus !== VerificationStatus.APPROVED) {
      throw new BadRequestException(
        'Requests can only be assigned to verified partners',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.serviceRequestMatch.updateMany({
        where: {
          requestId,
          organizationId: { not: org.id },
          status: ServiceMatchStatus.OFFERED,
        },
        data: { status: ServiceMatchStatus.WITHDRAWN },
      });
      await tx.serviceRequestMatch.upsert({
        where: {
          requestId_organizationId: { requestId, organizationId: org.id },
        },
        create: { requestId, organizationId: org.id },
        update: {
          status: ServiceMatchStatus.OFFERED,
          respondedAt: null,
        },
      });
      await tx.serviceRequestUpdate.create({
        data: {
          requestId,
          actor: 'ADMIN',
          status: ServiceRequestStatus.MATCHED,
          note: 'Matched with a verified provider by the GarudHub team',
        },
      });
      return tx.serviceRequest.update({
        where: { id: requestId },
        data: {
          status: ServiceRequestStatus.MATCHED,
          matchScope: 'ADMIN',
        },
      });
    });

    void this.notifications.notifyServiceRequestMatched({
      requestId,
      title: request.title,
      categoryLabel: CATEGORY_LABELS[request.category],
      location: location(request),
      recipients: [
        {
          email: org.contactEmail,
          companyName: org.companyName,
          userId: org.ownerId,
        },
      ],
    });
    return updated;
  }

  async adminSetStatus(
    requestId: string,
    _adminUserId: string,
    dto: AdminServiceRequestStatusDto,
  ) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Service request not found');
    if (
      dto.status !== ServiceRequestStatus.CANCELLED &&
      dto.status !== ServiceRequestStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Admins can cancel or complete requests; use assign / rematch to move them forward',
      );
    }
    if (
      dto.status === ServiceRequestStatus.COMPLETED &&
      !request.assignedOrganizationId
    ) {
      throw new BadRequestException(
        'Only an assigned request can be completed',
      );
    }
    return this.transition(requestId, request.status, dto.status, {
      actor: 'ADMIN',
      note: dto.note?.trim() || null,
    });
  }
}
