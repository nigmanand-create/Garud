import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PartnershipRequestStatus,
  Prisma,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreatePartnershipRequestDto,
  DecidePartnershipRequestDto,
} from './dto/partnership.dto';

const OPEN_STATUSES: PartnershipRequestStatus[] = [
  PartnershipRequestStatus.SUBMITTED,
  PartnershipRequestStatus.UNDER_REVIEW,
];

const DECISION_STATUSES: PartnershipRequestStatus[] = [
  PartnershipRequestStatus.UNDER_REVIEW,
  PartnershipRequestStatus.APPROVED,
  PartnershipRequestStatus.DECLINED,
];

const PARTNER_INCLUDE = {
  targetOrganization: { select: { id: true, companyName: true } },
} satisfies Prisma.PartnershipRequestInclude;

const ADMIN_INCLUDE = {
  organization: {
    select: { id: true, companyName: true, contactEmail: true },
  },
  targetOrganization: { select: { id: true, companyName: true } },
} satisfies Prisma.PartnershipRequestInclude;

@Injectable()
export class PartnershipsService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireOrgId(userId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!org) {
      throw new NotFoundException('Partner organization not found');
    }
    return org.id;
  }

  async listForPartner(userId: string) {
    const organizationId = await this.requireOrgId(userId);
    const [items, incoming] = await Promise.all([
      this.prisma.partnershipRequest.findMany({
        where: { organizationId },
        include: PARTNER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.partnershipRequest.findMany({
        where: {
          targetOrganizationId: organizationId,
          status: PartnershipRequestStatus.APPROVED,
        },
        select: {
          id: true,
          type: true,
          title: true,
          reviewedAt: true,
          organization: { select: { id: true, companyName: true } },
        },
        orderBy: { reviewedAt: 'desc' },
        take: 50,
      }),
    ]);
    return { items, incomingApproved: incoming };
  }

  async create(userId: string, dto: CreatePartnershipRequestDto) {
    const organizationId = await this.requireOrgId(userId);

    if (dto.targetOrganizationId) {
      if (dto.targetOrganizationId === organizationId) {
        throw new BadRequestException(
          'You cannot send a partnership request to your own organization',
        );
      }
      const target = await this.prisma.organization.findUnique({
        where: { id: dto.targetOrganizationId },
        select: { verificationStatus: true },
      });
      if (
        !target ||
        target.verificationStatus !== VerificationStatus.APPROVED
      ) {
        throw new BadRequestException(
          'Target must be a verified partner organization',
        );
      }
    }

    const duplicate = await this.prisma.partnershipRequest.findFirst({
      where: {
        organizationId,
        type: dto.type,
        targetOrganizationId: dto.targetOrganizationId ?? null,
        status: { in: OPEN_STATUSES },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException(
        'You already have an open request of this type for the same target',
      );
    }

    return this.prisma.partnershipRequest.create({
      data: {
        organizationId,
        type: dto.type,
        title: dto.title.trim(),
        message: dto.message.trim(),
        regions: dto.regions?.trim() || null,
        targetOrganizationId: dto.targetOrganizationId ?? null,
      },
      include: PARTNER_INCLUDE,
    });
  }

  async withdraw(userId: string, id: string) {
    const organizationId = await this.requireOrgId(userId);
    const request = await this.prisma.partnershipRequest.findFirst({
      where: { id, organizationId },
    });
    if (!request) {
      throw new NotFoundException('Partnership request not found');
    }
    if (!OPEN_STATUSES.includes(request.status)) {
      throw new BadRequestException('Only open requests can be withdrawn');
    }
    return this.prisma.partnershipRequest.update({
      where: { id },
      data: { status: PartnershipRequestStatus.WITHDRAWN },
      include: PARTNER_INCLUDE,
    });
  }

  async listForAdmin(params: {
    status?: PartnershipRequestStatus;
    skip?: number;
    take?: number;
  }) {
    const take = Math.min(Math.max(params.take ?? 50, 1), 100);
    const skip = Math.max(params.skip ?? 0, 0);
    const where: Prisma.PartnershipRequestWhereInput = params.status
      ? { status: params.status }
      : {};

    const [items, total, groups] = await Promise.all([
      this.prisma.partnershipRequest.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.partnershipRequest.count({ where }),
      this.prisma.partnershipRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      Object.values(PartnershipRequestStatus).map((s) => [s, 0]),
    ) as Record<PartnershipRequestStatus, number>;
    for (const g of groups) statusCounts[g.status] = g._count._all;

    return { items, total, skip, take, statusCounts };
  }

  async decide(
    adminUserId: string,
    id: string,
    dto: DecidePartnershipRequestDto,
  ) {
    if (!DECISION_STATUSES.includes(dto.status)) {
      throw new BadRequestException(
        'Status must be UNDER_REVIEW, APPROVED or DECLINED',
      );
    }
    const request = await this.prisma.partnershipRequest.findUnique({
      where: { id },
    });
    if (!request) {
      throw new NotFoundException('Partnership request not found');
    }
    if (request.status === PartnershipRequestStatus.WITHDRAWN) {
      throw new BadRequestException('Request was withdrawn by the partner');
    }
    return this.prisma.partnershipRequest.update({
      where: { id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote?.trim() || null,
        reviewedByUserId: adminUserId,
        reviewedAt: new Date(),
      },
      include: ADMIN_INCLUDE,
    });
  }
}
