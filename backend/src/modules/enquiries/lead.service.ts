import { Injectable, NotFoundException } from '@nestjs/common';
import { EnquiryIntent, LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UpdateLeadDto } from './dto/enquiry.dto';

export type ListLeadsParams = {
  status?: LeadStatus;
  intent?: EnquiryIntent;
  q?: string;
  skip?: number;
  take?: number;
};

const LEAD_INCLUDE = {
  enquiry: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      subject: true,
      message: true,
      sourcePage: true,
      serviceKey: true,
      createdAt: true,
    },
  },
  listing: { select: { id: true, name: true, sku: true } },
} satisfies Prisma.LeadInclude;

/** Partner-facing lead inbox (leads are created by EnquiryService routing). */
@Injectable()
export class LeadService {
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

  async listForPartner(userId: string, params: ListLeadsParams = {}) {
    const organizationId = await this.requireOrgId(userId);
    const take = Math.min(Math.max(params.take ?? 50, 1), 100);
    const skip = Math.max(params.skip ?? 0, 0);
    const q = params.q?.trim();
    const where: Prisma.LeadWhereInput = {
      organizationId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.intent ? { intent: params.intent } : {}),
      ...(q
        ? {
            enquiry: {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { subject: { contains: q, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [items, total, groups] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: LEAD_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.lead.count({ where }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<LeadStatus, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      WON: 0,
      LOST: 0,
    };
    for (const g of groups) {
      statusCounts[g.status] = g._count._all;
    }

    return { items, total, skip, take, statusCounts };
  }

  async updateForPartner(userId: string, leadId: string, dto: UpdateLeadDto) {
    const organizationId = await this.requireOrgId(userId);
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: dto.status,
        partnerNote: dto.partnerNote?.trim(),
        contactedAt:
          dto.status &&
          dto.status !== LeadStatus.NEW &&
          lead.contactedAt == null
            ? new Date()
            : undefined,
      },
      include: LEAD_INCLUDE,
    });
  }
}
