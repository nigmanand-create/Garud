import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

export const AUDIT_KINDS = [
  'KYC',
  'LISTING',
  'PARTNERSHIP',
  'ENQUIRY',
  'USER',
] as const;
export type AuditKind = (typeof AUDIT_KINDS)[number];

export type AuditEvent = {
  id: string;
  kind: AuditKind;
  /** Short machine label, e.g. STATUS_CHANGE, ROUTED, ROLE_CHANGED. */
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actor: { id: string; email: string | null } | null;
  /** What the event is about (organization, listing, request, enquiry, user). */
  subject: { id: string; label: string };
  createdAt: Date;
};

export type AuditLogQuery = {
  kinds?: AuditKind[];
  actorUserId?: string;
  search?: string;
  from?: Date;
  to?: Date;
  skip?: number;
  take?: number;
};

const MAX_TAKE = 100;
const MAX_WINDOW = 1000;

/** Parses `kind=KYC,LISTING` (or a single value) into valid kinds; empty => all. */
export function parseAuditKinds(raw?: string): AuditKind[] | undefined {
  if (!raw) return undefined;
  const kinds = raw
    .split(',')
    .map((k) => k.trim().toUpperCase())
    .filter((k): k is AuditKind =>
      (AUDIT_KINDS as readonly string[]).includes(k),
    );
  return kinds.length ? Array.from(new Set(kinds)) : undefined;
}

/** Runs `fn` only when `on`; otherwise resolves to an empty list. */
function when<T>(on: boolean, fn: () => Promise<T[]>): Promise<T[]> {
  return on ? fn() : Promise.resolve([]);
}

/** Newest-first merge of per-source event lists, then page slice. */
export function mergeAuditEvents(
  sources: AuditEvent[][],
  skip: number,
  take: number,
): AuditEvent[] {
  return sources
    .flat()
    .sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    )
    .slice(skip, skip + take);
}

/**
 * Global admin audit log (B5): one paginated, filterable timeline over
 * KYC decisions, listing moderation, partnership decisions, enquiry routing and
 * admin user/role management. Each source keeps its own table; we merge on read.
 */
@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditLogQuery) {
    const take = Math.min(Math.max(query.take ?? 25, 1), MAX_TAKE);
    const skip = Math.min(Math.max(query.skip ?? 0, 0), MAX_WINDOW);
    const window = skip + take;
    const wanted = new Set<AuditKind>(query.kinds ?? AUDIT_KINDS);
    const search = query.search?.trim() || undefined;

    const dateRange = (field: 'createdAt' | 'reviewedAt' | 'routedAt') =>
      query.from || query.to
        ? {
            [field]: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {};
    const contains = (value: string) => ({
      contains: value,
      mode: 'insensitive' as const,
    });

    const kycWhere: Prisma.VerificationAuditLogWhereInput = {
      ...dateRange('createdAt'),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(search
        ? {
            OR: [
              { note: contains(search) },
              { organization: { companyName: contains(search) } },
            ],
          }
        : {}),
    };
    const listingWhere: Prisma.ListingModerationAuditLogWhereInput = {
      ...dateRange('createdAt'),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(search
        ? {
            OR: [
              { note: contains(search) },
              { listing: { name: contains(search) } },
              { listing: { organization: { companyName: contains(search) } } },
            ],
          }
        : {}),
    };
    const partnershipWhere: Prisma.PartnershipRequestWhereInput = {
      reviewedAt:
        query.from || query.to
          ? {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            }
          : { not: null },
      ...(query.actorUserId ? { reviewedByUserId: query.actorUserId } : {}),
      ...(search
        ? {
            OR: [
              { adminNote: contains(search) },
              { title: contains(search) },
              { organization: { companyName: contains(search) } },
            ],
          }
        : {}),
    };
    const enquiryWhere: Prisma.EnquiryWhereInput = {
      routedAt:
        query.from || query.to
          ? {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            }
          : { not: null },
      ...(query.actorUserId ? { routedByUserId: query.actorUserId } : {}),
      ...(search
        ? {
            OR: [
              { subject: contains(search) },
              { name: contains(search) },
              { organization: { companyName: contains(search) } },
            ],
          }
        : {}),
    };
    const userWhere: Prisma.AdminUserAuditLogWhereInput = {
      ...dateRange('createdAt'),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(search
        ? {
            OR: [
              { targetEmail: contains(search) },
              { detail: contains(search) },
            ],
          }
        : {}),
    };

    const [kycCount, listingCount, partnershipCount, enquiryCount, userCount] =
      await Promise.all([
        this.prisma.verificationAuditLog.count({ where: kycWhere }),
        this.prisma.listingModerationAuditLog.count({ where: listingWhere }),
        this.prisma.partnershipRequest.count({ where: partnershipWhere }),
        this.prisma.enquiry.count({ where: enquiryWhere }),
        this.prisma.adminUserAuditLog.count({ where: userWhere }),
      ]);
    const kindCounts: Record<AuditKind, number> = {
      KYC: kycCount,
      LISTING: listingCount,
      PARTNERSHIP: partnershipCount,
      ENQUIRY: enquiryCount,
      USER: userCount,
    };

    const [kyc, listing, partnership, enquiry, user] = await Promise.all([
      when(wanted.has('KYC'), () =>
        this.prisma.verificationAuditLog.findMany({
          where: kycWhere,
          orderBy: { createdAt: 'desc' },
          take: window,
          include: {
            organization: { select: { id: true, companyName: true } },
          },
        }),
      ),
      when(wanted.has('LISTING'), () =>
        this.prisma.listingModerationAuditLog.findMany({
          where: listingWhere,
          orderBy: { createdAt: 'desc' },
          take: window,
          include: { listing: { select: { id: true, name: true } } },
        }),
      ),
      when(wanted.has('PARTNERSHIP'), () =>
        this.prisma.partnershipRequest.findMany({
          where: partnershipWhere,
          orderBy: { reviewedAt: 'desc' },
          take: window,
          select: {
            id: true,
            title: true,
            status: true,
            adminNote: true,
            reviewedByUserId: true,
            reviewedAt: true,
            organization: { select: { companyName: true } },
          },
        }),
      ),
      when(wanted.has('ENQUIRY'), () =>
        this.prisma.enquiry.findMany({
          where: enquiryWhere,
          orderBy: { routedAt: 'desc' },
          take: window,
          select: {
            id: true,
            subject: true,
            routedAt: true,
            routedByUserId: true,
            organization: { select: { companyName: true } },
          },
        }),
      ),
      when(wanted.has('USER'), () =>
        this.prisma.adminUserAuditLog.findMany({
          where: userWhere,
          orderBy: { createdAt: 'desc' },
          take: window,
        }),
      ),
    ]);

    const actorIds = new Set<string>();
    kyc.forEach((e) => actorIds.add(e.actorUserId));
    listing.forEach((e) => actorIds.add(e.actorUserId));
    partnership.forEach(
      (e) => e.reviewedByUserId && actorIds.add(e.reviewedByUserId),
    );
    enquiry.forEach((e) => e.routedByUserId && actorIds.add(e.routedByUserId));
    user.forEach((e) => actorIds.add(e.actorUserId));
    const actors = actorIds.size
      ? await this.prisma.user.findMany({
          where: { id: { in: Array.from(actorIds) } },
          select: { id: true, email: true },
        })
      : [];
    const emailById = new Map(actors.map((a) => [a.id, a.email]));
    const actorOf = (id: string | null | undefined) =>
      id ? { id, email: emailById.get(id) ?? null } : null;

    const sources: AuditEvent[][] = [
      kyc.map((e) => ({
        id: `kyc:${e.id}`,
        kind: 'KYC' as const,
        action: 'STATUS_CHANGE',
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        note: e.note,
        actor: actorOf(e.actorUserId),
        subject: { id: e.organization.id, label: e.organization.companyName },
        createdAt: e.createdAt,
      })),
      listing.map((e) => ({
        id: `listing:${e.id}`,
        kind: 'LISTING' as const,
        action: 'STATUS_CHANGE',
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        note: e.note,
        actor: actorOf(e.actorUserId),
        subject: { id: e.listing.id, label: e.listing.name },
        createdAt: e.createdAt,
      })),
      partnership.map((e) => ({
        id: `partnership:${e.id}`,
        kind: 'PARTNERSHIP' as const,
        action: 'DECISION',
        fromStatus: null,
        toStatus: e.status,
        note: e.adminNote,
        actor: actorOf(e.reviewedByUserId),
        subject: {
          id: e.id,
          label: `${e.title} — ${e.organization.companyName}`,
        },
        createdAt: e.reviewedAt as Date,
      })),
      enquiry.map((e) => ({
        id: `enquiry:${e.id}`,
        kind: 'ENQUIRY' as const,
        action: 'ROUTED',
        fromStatus: null,
        toStatus: 'ROUTED',
        note: e.organization ? `Routed to ${e.organization.companyName}` : null,
        actor: actorOf(e.routedByUserId),
        subject: { id: e.id, label: e.subject },
        createdAt: e.routedAt as Date,
      })),
      user.map((e) => ({
        id: `user:${e.id}`,
        kind: 'USER' as const,
        action: e.action,
        fromStatus: null,
        toStatus: e.action,
        note: e.detail,
        actor: actorOf(e.actorUserId),
        subject: { id: e.targetUserId, label: e.targetEmail },
        createdAt: e.createdAt,
      })),
    ];

    const total = AUDIT_KINDS.filter((k) => wanted.has(k)).reduce(
      (sum, k) => sum + kindCounts[k],
      0,
    );

    return {
      items: mergeAuditEvents(sources, skip, take),
      total,
      skip,
      take,
      kindCounts,
    };
  }

  /** Newest N events across all sources (dashboard widget). */
  async recent(take = 8) {
    const { items } = await this.list({ take, skip: 0 });
    return items;
  }
}
