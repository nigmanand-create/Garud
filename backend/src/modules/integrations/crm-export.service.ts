import { Injectable } from '@nestjs/common';
import { EnquiryIntent, EnquiryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { toCsv, type CsvColumn } from './csv.util';

export type EnquiryExportFilters = {
  status?: EnquiryStatus;
  intent?: EnquiryIntent;
  routing?: 'ROUTED' | 'UNROUTED';
  from?: Date;
  to?: Date;
};

export const ENQUIRY_EXPORT_MAX_ROWS = 10_000;

type ExportRow = Prisma.EnquiryGetPayload<{
  include: {
    organization: { select: { id: true; companyName: true } };
    listing: { select: { id: true; name: true } };
    lead: { select: { id: true; status: true } };
  };
}>;

const COLUMNS: CsvColumn<ExportRow>[] = [
  { header: 'enquiry_id', value: (r) => r.id },
  { header: 'created_at', value: (r) => r.createdAt },
  { header: 'name', value: (r) => r.name },
  { header: 'email', value: (r) => r.email },
  { header: 'phone', value: (r) => r.phone },
  { header: 'subject', value: (r) => r.subject },
  { header: 'message', value: (r) => r.message },
  { header: 'intent', value: (r) => r.intent },
  { header: 'service_key', value: (r) => r.serviceKey },
  { header: 'source_page', value: (r) => r.sourcePage },
  { header: 'enquiry_status', value: (r) => r.status },
  { header: 'routed_at', value: (r) => r.routedAt },
  { header: 'partner_org_id', value: (r) => r.organization?.id },
  { header: 'partner_company', value: (r) => r.organization?.companyName },
  { header: 'listing_id', value: (r) => r.listing?.id },
  { header: 'listing_name', value: (r) => r.listing?.name },
  { header: 'lead_id', value: (r) => r.lead?.id },
  { header: 'lead_status', value: (r) => r.lead?.status },
];

/** CRM-friendly CSV of enquiries joined with their routed partner lead. */
@Injectable()
export class CrmExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportEnquiriesCsv(filters: EnquiryExportFilters = {}) {
    const where: Prisma.EnquiryWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.intent ? { intent: filters.intent } : {}),
      ...(filters.routing === 'ROUTED'
        ? { organizationId: { not: null } }
        : filters.routing === 'UNROUTED'
          ? { organizationId: null }
          : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };
    const rows = await this.prisma.enquiry.findMany({
      where,
      include: {
        organization: { select: { id: true, companyName: true } },
        listing: { select: { id: true, name: true } },
        lead: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: ENQUIRY_EXPORT_MAX_ROWS,
    });
    return { csv: toCsv(rows, COLUMNS), rowCount: rows.length };
  }
}
