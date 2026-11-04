import { Test } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  AdminAuditService,
  mergeAuditEvents,
  parseAuditKinds,
  type AuditEvent,
} from './admin-audit.service';

const ev = (id: string, iso: string): AuditEvent => ({
  id,
  kind: 'KYC',
  action: 'STATUS_CHANGE',
  fromStatus: null,
  toStatus: null,
  note: null,
  actor: null,
  subject: { id: 's', label: 'S' },
  createdAt: new Date(iso),
});

describe('audit helpers', () => {
  it('parses kind filters, ignoring unknown values', () => {
    expect(parseAuditKinds(undefined)).toBeUndefined();
    expect(parseAuditKinds('kyc, listing,bogus,KYC')).toEqual([
      'KYC',
      'LISTING',
    ]);
    expect(parseAuditKinds('bogus')).toBeUndefined();
  });

  it('merges newest-first and slices the requested page', () => {
    const merged = mergeAuditEvents(
      [
        [ev('a', '2026-11-01T10:00:00Z'), ev('c', '2026-11-03T10:00:00Z')],
        [ev('b', '2026-11-02T10:00:00Z'), ev('d', '2026-11-04T10:00:00Z')],
      ],
      1,
      2,
    );
    expect(merged.map((e) => e.id)).toEqual(['c', 'b']);
  });
});

describe('AdminAuditService', () => {
  let service: AdminAuditService;

  const prismaMock = {
    verificationAuditLog: { count: jest.fn(), findMany: jest.fn() },
    listingModerationAuditLog: { count: jest.fn(), findMany: jest.fn() },
    partnershipRequest: { count: jest.fn(), findMany: jest.fn() },
    enquiry: { count: jest.fn(), findMany: jest.fn() },
    adminUserAuditLog: { count: jest.fn(), findMany: jest.fn() },
    user: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    for (const m of [
      prismaMock.verificationAuditLog,
      prismaMock.listingModerationAuditLog,
      prismaMock.partnershipRequest,
      prismaMock.enquiry,
      prismaMock.adminUserAuditLog,
    ]) {
      m.count.mockResolvedValue(0);
      m.findMany.mockResolvedValue([]);
    }
    prismaMock.user.findMany.mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [
        AdminAuditService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(AdminAuditService);
  });

  it('merges KYC, listing, partnership, enquiry and user events with actor emails', async () => {
    prismaMock.verificationAuditLog.count.mockResolvedValue(1);
    prismaMock.verificationAuditLog.findMany.mockResolvedValue([
      {
        id: 'k1',
        actorUserId: 'admin-1',
        fromStatus: 'SUBMITTED',
        toStatus: 'APPROVED',
        note: null,
        createdAt: new Date('2026-11-01T00:00:00Z'),
        organization: { id: 'org-1', companyName: 'Acme' },
      },
    ]);
    prismaMock.listingModerationAuditLog.count.mockResolvedValue(1);
    prismaMock.listingModerationAuditLog.findMany.mockResolvedValue([
      {
        id: 'l1',
        actorUserId: 'admin-1',
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'REJECTED',
        note: 'Bad specs',
        createdAt: new Date('2026-11-03T00:00:00Z'),
        listing: { id: 'lst-1', name: 'Drone X' },
      },
    ]);
    prismaMock.partnershipRequest.count.mockResolvedValue(1);
    prismaMock.partnershipRequest.findMany.mockResolvedValue([
      {
        id: 'p1',
        title: 'South distribution',
        status: 'APPROVED',
        adminNote: 'ok',
        reviewedByUserId: 'admin-2',
        reviewedAt: new Date('2026-11-04T00:00:00Z'),
        organization: { companyName: 'Dist Co' },
      },
    ]);
    prismaMock.enquiry.count.mockResolvedValue(1);
    prismaMock.enquiry.findMany.mockResolvedValue([
      {
        id: 'e1',
        subject: 'Need spray drone',
        routedAt: new Date('2026-11-02T00:00:00Z'),
        routedByUserId: 'admin-1',
        organization: { companyName: 'Acme' },
      },
    ]);
    prismaMock.adminUserAuditLog.count.mockResolvedValue(1);
    prismaMock.adminUserAuditLog.findMany.mockResolvedValue([
      {
        id: 'u1',
        actorUserId: 'admin-1',
        targetUserId: 't1',
        targetEmail: 'new@garudhub.in',
        action: 'USER_CREATED',
        detail: 'Created platform admin',
        createdAt: new Date('2026-11-04T06:00:00Z'),
      },
    ]);
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'admin-1', email: 'a1@garudhub.in' },
      { id: 'admin-2', email: 'a2@garudhub.in' },
    ]);

    const res = await service.list({});

    expect(res.total).toBe(5);
    expect(res.kindCounts).toEqual({
      KYC: 1,
      LISTING: 1,
      PARTNERSHIP: 1,
      ENQUIRY: 1,
      USER: 1,
    });
    expect(res.items.map((e) => e.id)).toEqual([
      'user:u1',
      'partnership:p1',
      'listing:l1',
      'enquiry:e1',
      'kyc:k1',
    ]);
    expect(res.items[1].actor).toEqual({
      id: 'admin-2',
      email: 'a2@garudhub.in',
    });
    expect(res.items[2]).toMatchObject({
      kind: 'LISTING',
      toStatus: 'REJECTED',
      subject: { id: 'lst-1', label: 'Drone X' },
    });
  });

  it('only queries selected kinds but still reports counts for all', async () => {
    prismaMock.partnershipRequest.count.mockResolvedValue(7);
    prismaMock.verificationAuditLog.count.mockResolvedValue(3);

    const res = await service.list({ kinds: ['KYC'] });

    expect(prismaMock.verificationAuditLog.findMany).toHaveBeenCalled();
    expect(
      prismaMock.listingModerationAuditLog.findMany,
    ).not.toHaveBeenCalled();
    expect(prismaMock.partnershipRequest.findMany).not.toHaveBeenCalled();
    expect(res.total).toBe(3);
    expect(res.kindCounts.PARTNERSHIP).toBe(7);
  });

  it('applies actor, search and date filters and clamps pagination', async () => {
    const from = new Date('2026-11-01T00:00:00Z');
    const to = new Date('2026-11-02T00:00:00Z');
    const res = await service.list({
      kinds: ['KYC', 'PARTNERSHIP'],
      actorUserId: 'admin-1',
      search: ' acme ',
      from,
      to,
      skip: 5000,
      take: 9999,
    });

    expect(res.take).toBe(100);
    expect(res.skip).toBe(1000);
    const kycArgs = prismaMock.verificationAuditLog.findMany.mock.calls[0][0];
    expect(kycArgs.take).toBe(1100);
    expect(kycArgs.where).toMatchObject({
      actorUserId: 'admin-1',
      createdAt: { gte: from, lte: to },
    });
    expect(kycArgs.where.OR).toHaveLength(2);
    const prArgs = prismaMock.partnershipRequest.findMany.mock.calls[0][0];
    expect(prArgs.where).toMatchObject({
      reviewedByUserId: 'admin-1',
      reviewedAt: { gte: from, lte: to },
    });
  });
});
