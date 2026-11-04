import { Test } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminOverviewService } from './admin-overview.service';

describe('AdminOverviewService', () => {
  let service: AdminOverviewService;

  const prismaMock = {
    organization: { groupBy: jest.fn() },
    partnerListing: { count: jest.fn() },
    enquiry: { groupBy: jest.fn(), count: jest.fn() },
    lead: { groupBy: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    partnershipRequest: { groupBy: jest.fn() },
    order: { count: jest.fn() },
    user: { count: jest.fn() },
  };
  const auditMock = { recent: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AdminOverviewService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AdminAuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(AdminOverviewService);
  });

  it('aggregates queue counts and attention total', async () => {
    prismaMock.organization.groupBy.mockResolvedValue([
      { verificationStatus: 'SUBMITTED', _count: { _all: 2 } },
      { verificationStatus: 'UNDER_REVIEW', _count: { _all: 1 } },
      { verificationStatus: 'APPROVED', _count: { _all: 9 } },
    ]);
    prismaMock.partnerListing.count.mockResolvedValue(4);
    prismaMock.enquiry.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { _all: 5 } },
      { status: 'CLOSED', _count: { _all: 10 } },
    ]);
    prismaMock.enquiry.count.mockResolvedValue(3);
    prismaMock.lead.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { _all: 6 } },
      { status: 'WON', _count: { _all: 1 } },
    ]);
    prismaMock.lead.count.mockResolvedValue(2);
    prismaMock.partnershipRequest.groupBy.mockResolvedValue([
      { status: 'SUBMITTED', _count: { _all: 1 } },
      { status: 'UNDER_REVIEW', _count: { _all: 1 } },
      { status: 'APPROVED', _count: { _all: 8 } },
    ]);
    prismaMock.order.count.mockResolvedValue(7);
    prismaMock.user.count.mockResolvedValue(2);
    auditMock.recent.mockResolvedValue([{ id: 'kyc:1' }]);

    const res = await service.overview(new Date('2026-11-04T00:00:00Z'));

    expect(res.queues.kyc).toEqual({
      pending: 3,
      submitted: 2,
      underReview: 1,
    });
    expect(res.queues.listings.pendingReview).toBe(4);
    expect(res.queues.enquiries).toEqual({ new: 5, newUnrouted: 3, total: 15 });
    expect(res.queues.leads).toMatchObject({ new: 6, stale: 2, total: 7 });
    expect(res.queues.partnerships.pending).toBe(2);
    expect(res.queues.orders.paymentPending).toBe(7);
    expect(res.queues.admins.active).toBe(2);
    // kyc 3 + listings 4 + new enquiries 5 + partnerships 2 + stale leads 2
    expect(res.attentionTotal).toBe(16);
    expect(res.recentActivity).toHaveLength(1);
    const staleArgs = prismaMock.lead.count.mock.calls[0][0];
    expect(staleArgs.where.createdAt.lt).toEqual(
      new Date('2026-11-01T00:00:00Z'),
    );
  });

  it('lists leads with status counts and a stale filter', async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);
    prismaMock.lead.count.mockResolvedValue(0);
    prismaMock.lead.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { _all: 4 } },
    ]);

    const res = await service.listLeads({ stale: true, take: 1000 });

    const args = prismaMock.lead.findMany.mock.calls[0][0];
    expect(args.take).toBe(100);
    expect(args.where.status).toBe('NEW');
    expect(args.where.createdAt.lt).toEqual(expect.any(Date));
    expect(res.statusCounts).toMatchObject({ NEW: 4, WON: 0 });
  });
});
