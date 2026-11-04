import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GovOpportunityStatus,
  GovOpportunityType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreateGovOpportunityDto,
  UpdateGovOpportunityDto,
} from './dto/gov.dto';
import { isOpportunityExpired } from './gov.rules';

function withFlags<T extends { closingDate: Date | null }>(row: T) {
  return { ...row, isExpired: isOpportunityExpired(row.closingDate) };
}

@Injectable()
export class GovService {
  constructor(private readonly prisma: PrismaService) {}

  // --- public ------------------------------------------------------------------

  async listPublic(
    params: {
      type?: GovOpportunityType;
      state?: string;
      q?: string;
      includeExpired?: boolean;
      skip?: number;
      take?: number;
    } = {},
  ) {
    const take = Math.min(Math.max(params.take ?? 30, 1), 100);
    const skip = Math.max(params.skip ?? 0, 0);
    const q = params.q?.trim();
    const state = params.state?.trim();
    const where: Prisma.GovOpportunityWhereInput = {
      status: GovOpportunityStatus.PUBLISHED,
      ...(params.type ? { type: params.type } : {}),
      ...(state
        ? {
            OR: [
              { state: { equals: state, mode: 'insensitive' } },
              { state: null },
            ],
          }
        : {}),
    };
    const ands: Prisma.GovOpportunityWhereInput[] = [];
    if (!params.includeExpired) {
      ands.push({
        OR: [{ closingDate: null }, { closingDate: { gte: new Date() } }],
      });
    }
    if (q) {
      ands.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
          { issuingBody: { contains: q, mode: 'insensitive' } },
          { referenceNo: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    const finalWhere: Prisma.GovOpportunityWhereInput = {
      ...where,
      AND: ands,
    };
    const [items, total] = await Promise.all([
      this.prisma.govOpportunity.findMany({
        where: finalWhere,
        orderBy: [
          { closingDate: { sort: 'asc', nulls: 'last' } },
          { publishedAt: 'desc' },
        ],
        skip,
        take,
      }),
      this.prisma.govOpportunity.count({ where: finalWhere }),
    ]);
    return { items: items.map(withFlags), total, skip, take };
  }

  async getPublic(id: string) {
    const row = await this.prisma.govOpportunity.findFirst({
      where: { id, status: { not: GovOpportunityStatus.DRAFT } },
    });
    if (!row) throw new NotFoundException('Opportunity not found');
    return withFlags(row);
  }

  // --- admin -------------------------------------------------------------------

  async listForAdmin(
    params: {
      status?: GovOpportunityStatus;
      type?: GovOpportunityType;
      skip?: number;
      take?: number;
    } = {},
  ) {
    const take = Math.min(Math.max(params.take ?? 50, 1), 100);
    const skip = Math.max(params.skip ?? 0, 0);
    const where: Prisma.GovOpportunityWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.type ? { type: params.type } : {}),
    };
    const [items, total, groups] = await Promise.all([
      this.prisma.govOpportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.govOpportunity.count({ where }),
      this.prisma.govOpportunity.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);
    const statusCounts: Record<GovOpportunityStatus, number> = {
      DRAFT: 0,
      PUBLISHED: 0,
      CLOSED: 0,
    };
    for (const g of groups) statusCounts[g.status] = g._count._all;
    return { items: items.map(withFlags), total, skip, take, statusCounts };
  }

  private checkDates(open?: Date | null, close?: Date | null) {
    if (open && close && close < open) {
      throw new BadRequestException('Closing date must be after the open date');
    }
  }

  async create(adminUserId: string, dto: CreateGovOpportunityDto) {
    const open = dto.openDate ? new Date(dto.openDate) : null;
    const close = dto.closingDate ? new Date(dto.closingDate) : null;
    this.checkDates(open, close);
    const status = dto.status ?? GovOpportunityStatus.DRAFT;
    const row = await this.prisma.govOpportunity.create({
      data: {
        type: dto.type,
        title: dto.title.trim(),
        summary: dto.summary.trim(),
        description: dto.description?.trim() || null,
        issuingBody: dto.issuingBody.trim(),
        referenceNo: dto.referenceNo?.trim() || null,
        state: dto.state?.trim() || null,
        sourceUrl: dto.sourceUrl?.trim() || null,
        estimatedValueInr: dto.estimatedValueInr ?? null,
        openDate: open,
        closingDate: close,
        eligibility: dto.eligibility?.trim() || null,
        status,
        publishedAt:
          status === GovOpportunityStatus.PUBLISHED ? new Date() : null,
        createdByUserId: adminUserId,
      },
    });
    return withFlags(row);
  }

  async update(id: string, dto: UpdateGovOpportunityDto) {
    const existing = await this.prisma.govOpportunity.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Opportunity not found');
    const open = dto.openDate ? new Date(dto.openDate) : existing.openDate;
    const close = dto.closingDate
      ? new Date(dto.closingDate)
      : existing.closingDate;
    this.checkDates(open, close);
    const row = await this.prisma.govOpportunity.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title?.trim(),
        summary: dto.summary?.trim(),
        description: dto.description?.trim(),
        issuingBody: dto.issuingBody?.trim(),
        referenceNo: dto.referenceNo?.trim(),
        state: dto.state?.trim(),
        sourceUrl: dto.sourceUrl?.trim(),
        estimatedValueInr: dto.estimatedValueInr,
        openDate: dto.openDate ? open : undefined,
        closingDate: dto.closingDate ? close : undefined,
        eligibility: dto.eligibility?.trim(),
        status: dto.status,
        publishedAt:
          dto.status === GovOpportunityStatus.PUBLISHED && !existing.publishedAt
            ? new Date()
            : undefined,
      },
    });
    return withFlags(row);
  }

  async remove(id: string) {
    const existing = await this.prisma.govOpportunity.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Opportunity not found');
    await this.prisma.govOpportunity.delete({ where: { id } });
    return { deleted: true };
  }
}
