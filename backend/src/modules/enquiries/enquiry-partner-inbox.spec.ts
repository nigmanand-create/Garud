import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EnquiryStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { EnquiryService } from './enquiry.service';

describe('EnquiryService partner inbox', () => {
  let service: EnquiryService;

  const prismaMock = {
    organization: { findUnique: jest.fn() },
    enquiry: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        EnquiryService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();
    service = module.get(EnquiryService);
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1' });
  });

  it('scopes the inbox to the partner organization with counts and search', async () => {
    prismaMock.enquiry.findMany.mockResolvedValue([]);
    prismaMock.enquiry.count.mockResolvedValue(0);
    prismaMock.enquiry.groupBy.mockResolvedValue([
      { status: EnquiryStatus.NEW, _count: { _all: 3 } },
    ]);

    const res = await service.listForPartner('user-1', {
      status: EnquiryStatus.NEW,
      q: ' rahul ',
    });

    const where = prismaMock.enquiry.findMany.mock.calls[0][0].where;
    expect(where.organizationId).toBe('org-1');
    expect(where.status).toBe(EnquiryStatus.NEW);
    expect(where.OR).toHaveLength(4);
    expect(res.statusCounts).toEqual({ NEW: 3, READ: 0, CLOSED: 0 });
  });

  it('only lets a partner update enquiries routed to them', async () => {
    prismaMock.enquiry.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.updateStatusForPartner('user-1', 'enq-x', {
        status: EnquiryStatus.READ,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prismaMock.enquiry.findFirst.mockResolvedValueOnce({ id: 'enq-1' });
    prismaMock.enquiry.update.mockResolvedValue({ id: 'enq-1' });
    await service.updateStatusForPartner('user-1', 'enq-1', {
      status: EnquiryStatus.CLOSED,
    });
    expect(prismaMock.enquiry.findFirst).toHaveBeenLastCalledWith({
      where: { id: 'enq-1', organizationId: 'org-1' },
      select: { id: true },
    });
    expect(prismaMock.enquiry.update).toHaveBeenCalledWith({
      where: { id: 'enq-1' },
      data: { status: EnquiryStatus.CLOSED },
    });
  });
});
