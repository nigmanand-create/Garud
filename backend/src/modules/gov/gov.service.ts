import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import {
  GovOpportunityStatus,
  GovOpportunityType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreateGovOpportunityDto,
  ImportGovOpportunityRowDto,
  SubmitGovBidDto,
  UpdateGovOpportunityDto,
} from './dto/gov.dto';
import { GovBidDocumentService } from './gov-bid-document.service';
import { mapCsvRow, parseCsvText, parseTruthyPublish } from './gov-csv.util';
import { areTenderBidsUnsealed, isOpportunityExpired } from './gov.rules';

export type GovImportRowResult = {
  row: number;
  action: 'created' | 'updated' | 'skipped' | 'error';
  message?: string;
  id?: string;
  referenceNo?: string | null;
  title?: string;
};

export type GovImportReport = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  rows: GovImportRowResult[];
};

const MAX_IMPORT_ROWS = 500;

function withFlags<T extends { closingDate: Date | null }>(row: T) {
  return { ...row, isExpired: isOpportunityExpired(row.closingDate) };
}

@Injectable()
export class GovService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bidDocuments: GovBidDocumentService,
  ) {}

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

  async importFromCsv(
    adminUserId: string,
    csvText: string,
  ): Promise<GovImportReport> {
    const parsed = parseCsvText(csvText.replace(/^\uFEFF/, ''));
    if (!parsed.headers.length) {
      throw new BadRequestException('CSV has no header row');
    }
    const records = parsed.rows.map((cells, idx) => ({
      rowNumber: idx + 2,
      raw: mapCsvRow(parsed.headers, cells),
    }));
    return this.importRawRows(adminUserId, records);
  }

  async importJsonRows(
    adminUserId: string,
    rows: ImportGovOpportunityRowDto[],
  ): Promise<GovImportReport> {
    if (!rows?.length) {
      throw new BadRequestException('No rows to import');
    }
    const records = rows.map((row, idx) => ({
      rowNumber: idx + 1,
      raw: this.jsonRowToRaw(row),
    }));
    return this.importRawRows(adminUserId, records);
  }

  private jsonRowToRaw(
    row: ImportGovOpportunityRowDto,
  ): Record<string, string> {
    const out: Record<string, string> = {};
    const put = (key: string, val: unknown) => {
      if (val === undefined || val === null) return;
      if (typeof val === 'number') out[key] = String(val);
      else if (typeof val === 'string' && val.trim() !== '')
        out[key] = val.trim();
      else if (typeof val === 'boolean') out[key] = val ? 'true' : 'false';
    };
    put('type', row.type);
    put('title', row.title);
    put('summary', row.summary);
    put('description', row.description);
    put('issuingBody', row.issuingBody);
    put('referenceNo', row.referenceNo);
    put('state', row.state);
    put('sourceUrl', row.sourceUrl);
    put('estimatedValueInr', row.estimatedValueInr);
    put('openDate', row.openDate);
    put('closingDate', row.closingDate);
    put('eligibility', row.eligibility);
    if (row.status === GovOpportunityStatus.PUBLISHED) put('publish', 'true');
    else if (row.publish) put('publish', row.publish);
    return out;
  }

  private async importRawRows(
    adminUserId: string,
    records: { rowNumber: number; raw: Record<string, string> }[],
  ): Promise<GovImportReport> {
    if (records.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `Import limited to ${MAX_IMPORT_ROWS} rows per request`,
      );
    }
    const report: GovImportReport = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      rows: [],
    };
    for (const { rowNumber, raw } of records) {
      try {
        const dto = this.rawToCreateDto(raw);
        const result = await this.upsertImportedRow(adminUserId, dto);
        report.rows.push({ row: rowNumber, ...result });
        if (result.action === 'created') report.created += 1;
        else if (result.action === 'updated') report.updated += 1;
        else report.skipped += 1;
      } catch (e) {
        const message =
          e instanceof BadRequestException
            ? e.message
            : 'Import failed for this row';
        report.rows.push({ row: rowNumber, action: 'error', message });
        report.errors += 1;
      }
    }
    return report;
  }

  private rawToCreateDto(raw: Record<string, string>): CreateGovOpportunityDto {
    const typeRaw = (raw.type ?? 'TENDER').trim().toUpperCase();
    if (!(typeRaw in GovOpportunityType)) {
      throw new BadRequestException(`Invalid type "${raw.type ?? ''}"`);
    }
    const title = raw.title?.trim() ?? '';
    const summary = raw.summary?.trim() ?? '';
    const issuingBody = raw.issuingBody?.trim() ?? '';
    if (title.length < 3)
      throw new BadRequestException('title is required (min 3 chars)');
    if (summary.length < 10) {
      throw new BadRequestException('summary is required (min 10 chars)');
    }
    if (issuingBody.length < 2) {
      throw new BadRequestException('issuingBody is required (min 2 chars)');
    }
    const publish = parseTruthyPublish(raw.publish);
    const status = publish
      ? GovOpportunityStatus.PUBLISHED
      : GovOpportunityStatus.DRAFT;
    const estimatedValueInr = raw.estimatedValueInr
      ? Number(raw.estimatedValueInr.replace(/,/g, ''))
      : undefined;
    if (
      raw.estimatedValueInr &&
      (estimatedValueInr === undefined || Number.isNaN(estimatedValueInr))
    ) {
      throw new BadRequestException('estimatedValueInr must be a number');
    }
    const sourceUrl = raw.sourceUrl?.trim();
    if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
      throw new BadRequestException(
        'officialUrl must start with http:// or https://',
      );
    }
    return {
      type: typeRaw as GovOpportunityType,
      title,
      summary,
      description: raw.description?.trim() || undefined,
      issuingBody,
      referenceNo: raw.referenceNo?.trim() || undefined,
      state: raw.state?.trim() || undefined,
      sourceUrl: sourceUrl || undefined,
      estimatedValueInr,
      openDate: this.parseImportDate(raw.openDate),
      closingDate: this.parseImportDate(raw.closingDate),
      eligibility: raw.eligibility?.trim() || undefined,
      status,
    };
  }

  private parseImportDate(raw?: string): string | undefined {
    if (!raw?.trim()) return undefined;
    const d = new Date(raw.trim());
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Invalid date "${raw}"`);
    }
    return d.toISOString();
  }

  private async upsertImportedRow(
    adminUserId: string,
    dto: CreateGovOpportunityDto,
  ): Promise<
    Omit<GovImportRowResult, 'row' | 'action'> & {
      action: 'created' | 'updated' | 'skipped';
    }
  > {
    const existing = await this.findDuplicateImport(dto);
    if (!existing) {
      const created = await this.create(adminUserId, dto);
      return {
        action: 'created',
        id: created.id,
        referenceNo: created.referenceNo,
        title: created.title,
      };
    }
    if (existing.status !== GovOpportunityStatus.DRAFT) {
      return {
        action: 'skipped',
        id: existing.id,
        referenceNo: existing.referenceNo,
        title: existing.title,
        message: `Existing ${existing.status} record not overwritten (dedupe match)`,
      };
    }
    const updated = await this.update(existing.id, {
      type: dto.type,
      title: dto.title,
      summary: dto.summary,
      description: dto.description,
      issuingBody: dto.issuingBody,
      referenceNo: dto.referenceNo,
      state: dto.state,
      sourceUrl: dto.sourceUrl,
      estimatedValueInr: dto.estimatedValueInr,
      openDate: dto.openDate,
      closingDate: dto.closingDate,
      eligibility: dto.eligibility,
      status: dto.status,
    });
    return {
      action: 'updated',
      id: updated.id,
      referenceNo: updated.referenceNo,
      title: updated.title,
    };
  }

  private async findDuplicateImport(dto: CreateGovOpportunityDto) {
    const ref = dto.referenceNo?.trim();
    if (ref) {
      const byRef = await this.prisma.govOpportunity.findFirst({
        where: { referenceNo: { equals: ref, mode: 'insensitive' } },
      });
      if (byRef) return byRef;
    }
    return this.prisma.govOpportunity.findFirst({
      where: {
        title: { equals: dto.title.trim(), mode: 'insensitive' },
        issuingBody: { equals: dto.issuingBody.trim(), mode: 'insensitive' },
      },
    });
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

  async getForAdmin(id: string) {
    const row = await this.prisma.govOpportunity.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Opportunity not found');
    const bids = await this.listBidsForAdmin(id, row.closingDate);
    return { ...withFlags(row), bids };
  }

  private async requireOpenTender(opportunityId: string) {
    const row = await this.prisma.govOpportunity.findUnique({
      where: { id: opportunityId },
    });
    if (!row || row.status !== GovOpportunityStatus.PUBLISHED) {
      throw new NotFoundException('Opportunity not found');
    }
    if (row.type !== GovOpportunityType.TENDER) {
      throw new BadRequestException('Only tenders accept sealed bids');
    }
    if (isOpportunityExpired(row.closingDate)) {
      throw new BadRequestException('Bidding is closed for this tender');
    }
    if (row.openDate && row.openDate.getTime() > Date.now()) {
      throw new BadRequestException('This tender is not open for bids yet');
    }
    return row;
  }

  assertBidderRole(role: UserRole) {
    if (role !== UserRole.BUYER && role !== UserRole.GOVERNMENT) {
      throw new ForbiddenException(
        'Only buyer accounts can submit tender bids',
      );
    }
  }

  async submitBid(
    userId: string,
    role: UserRole,
    opportunityId: string,
    dto: SubmitGovBidDto,
  ) {
    this.assertBidderRole(role);
    await this.requireOpenTender(opportunityId);
    const path = dto.storedRelativePath?.trim();
    if (path) {
      this.bidDocuments.assertOwnedBidPath(userId, path);
    }
    const row = await this.prisma.govOpportunityBid.upsert({
      where: {
        opportunityId_bidderUserId: {
          opportunityId,
          bidderUserId: userId,
        },
      },
      create: {
        opportunityId,
        bidderUserId: userId,
        amountInr: dto.amountInr,
        storedRelativePath: path || null,
        originalFilename: dto.originalFilename?.trim() || null,
        mimeType: dto.mimeType?.trim() || null,
      },
      update: {
        amountInr: dto.amountInr,
        storedRelativePath: path || null,
        originalFilename: dto.originalFilename?.trim() || null,
        mimeType: dto.mimeType?.trim() || null,
      },
    });
    return {
      id: row.id,
      opportunityId: row.opportunityId,
      amountInr: row.amountInr,
      hasDocument: Boolean(row.storedRelativePath),
      submittedAt: row.updatedAt.toISOString(),
    };
  }

  async getMyBid(userId: string, role: UserRole, opportunityId: string) {
    this.assertBidderRole(role);
    const bid = await this.prisma.govOpportunityBid.findUnique({
      where: {
        opportunityId_bidderUserId: { opportunityId, bidderUserId: userId },
      },
    });
    if (!bid) return { bid: null };
    return {
      bid: {
        id: bid.id,
        amountInr: bid.amountInr,
        hasDocument: Boolean(bid.storedRelativePath),
        submittedAt: bid.updatedAt.toISOString(),
      },
    };
  }

  /** All sealed bids placed by this user (for buyer / government hub). */
  async listMyBids(userId: string, role: UserRole) {
    this.assertBidderRole(role);
    const rows = await this.prisma.govOpportunityBid.findMany({
      where: { bidderUserId: userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        opportunity: {
          select: {
            id: true,
            type: true,
            title: true,
            issuingBody: true,
            status: true,
            closingDate: true,
            referenceNo: true,
          },
        },
      },
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        opportunityId: row.opportunityId,
        amountInr: row.amountInr,
        hasDocument: Boolean(row.storedRelativePath),
        submittedAt: row.updatedAt.toISOString(),
        opportunity: withFlags(row.opportunity),
      })),
    };
  }

  async listBidsForAdmin(opportunityId: string, closingDate?: Date | null) {
    const count = await this.prisma.govOpportunityBid.count({
      where: { opportunityId },
    });
    const unsealed = areTenderBidsUnsealed(closingDate ?? null);
    if (!unsealed) {
      return {
        sealed: true as const,
        bidCount: count,
        unsealsAt: closingDate?.toISOString() ?? null,
        items: [] as [],
      };
    }
    const rows = await this.prisma.govOpportunityBid.findMany({
      where: { opportunityId },
      orderBy: { amountInr: 'asc' },
      include: {
        bidder: { select: { id: true, email: true, role: true } },
      },
    });
    return {
      sealed: false as const,
      bidCount: count,
      unsealsAt: closingDate?.toISOString() ?? null,
      items: rows.map((b) => ({
        id: b.id,
        amountInr: b.amountInr,
        bidderEmail: b.bidder.email,
        bidderRole: b.bidder.role,
        originalFilename: b.originalFilename,
        hasDocument: Boolean(b.storedRelativePath),
        submittedAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
    };
  }

  async downloadBidDocumentForAdmin(
    opportunityId: string,
    bidId: string,
  ): Promise<StreamableFile> {
    const opp = await this.prisma.govOpportunity.findUnique({
      where: { id: opportunityId },
      select: { closingDate: true, type: true },
    });
    if (!opp || opp.type !== GovOpportunityType.TENDER) {
      throw new NotFoundException('Opportunity not found');
    }
    if (!areTenderBidsUnsealed(opp.closingDate ?? null)) {
      throw new ForbiddenException('Bid documents stay sealed until closing');
    }
    const bid = await this.prisma.govOpportunityBid.findFirst({
      where: { id: bidId, opportunityId },
    });
    if (!bid?.storedRelativePath) {
      throw new NotFoundException('Bid has no uploaded document');
    }
    return this.bidDocuments.openForAdmin(
      bid.storedRelativePath,
      bid.originalFilename ?? 'bid-document.pdf',
      bid.mimeType ?? 'application/pdf',
    );
  }
}
