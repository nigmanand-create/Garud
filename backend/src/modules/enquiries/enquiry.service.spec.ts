import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EnquiryIntent,
  EnquiryStatus,
  LeadStatus,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { EnquiryService } from './enquiry.service';
import { LeadService } from './lead.service';

describe('EnquiryService', () => {
  let service: EnquiryService;

  const mockEnquiry = {
    id: 'enq-1',
    name: 'Test User',
    email: 'test@example.com',
    phone: '+91 9999999999',
    subject: 'Compliance help',
    message: 'Need DGCA UIN support for our fleet.',
    sourcePage: '/enquiry?service=compliance',
    intent: EnquiryIntent.GENERAL,
    serviceKey: null,
    listingId: null,
    organizationId: null,
    routedAt: null,
    routedByUserId: null,
    status: EnquiryStatus.NEW,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const approvedOrg = {
    id: 'org-1',
    companyName: 'Partner Co',
    contactEmail: 'sales@partner.in',
    verificationStatus: VerificationStatus.APPROVED,
  };

  const prismaMock = {
    enquiry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    lead: {
      create: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    partnerListing: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const notifications = {
    notifyEnquiryCreated: jest.fn().mockResolvedValue(undefined),
    notifyEnquiryRouted: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnquiryService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compile();

    service = module.get<EnquiryService>(EnquiryService);
  });

  const baseDto = {
    name: '  Test User  ',
    email: 'Test@Example.com',
    phone: ' +91 9999999999 ',
    subject: ' Compliance help ',
    message: 'Need DGCA UIN support for our fleet.',
    sourcePage: '/enquiry?service=compliance',
  };

  it('creates an unrouted GENERAL enquiry with trimmed fields', async () => {
    prismaMock.enquiry.create.mockResolvedValue(mockEnquiry);

    const result = await service.create(baseDto);

    expect(prismaMock.enquiry.create).toHaveBeenCalledWith({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+91 9999999999',
        subject: 'Compliance help',
        message: 'Need DGCA UIN support for our fleet.',
        sourcePage: '/enquiry?service=compliance',
        intent: EnquiryIntent.GENERAL,
        serviceKey: null,
        listingId: null,
        organizationId: null,
        routedAt: null,
      },
    });
    expect(prismaMock.lead.create).not.toHaveBeenCalled();
    expect(notifications.notifyEnquiryCreated).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockEnquiry);
  });

  it('infers SERVICE intent for service vertical enquiries and keeps them in the admin queue', async () => {
    prismaMock.enquiry.create.mockResolvedValue({
      ...mockEnquiry,
      intent: EnquiryIntent.SERVICE,
      serviceKey: 'compliance',
    });

    await service.create({ ...baseDto, serviceKey: 'Compliance' });

    expect(prismaMock.enquiry.create.mock.calls[0][0].data).toMatchObject({
      intent: EnquiryIntent.SERVICE,
      serviceKey: 'compliance',
      organizationId: null,
    });
    expect(prismaMock.lead.create).not.toHaveBeenCalled();
  });

  it('routes listing enquiries to the vendor and creates a partner lead', async () => {
    prismaMock.partnerListing.findUnique.mockResolvedValue({
      id: 'lst-1',
      isPublished: true,
      reviewStatus: 'APPROVED',
      organization: approvedOrg,
    });
    prismaMock.enquiry.create.mockResolvedValue({
      ...mockEnquiry,
      id: 'enq-2',
      listingId: 'lst-1',
      organizationId: 'org-1',
      intent: EnquiryIntent.DEMO,
    });

    await service.create({
      ...baseDto,
      listingId: 'lst-1',
      intent: EnquiryIntent.DEMO,
    });

    expect(prismaMock.enquiry.create.mock.calls[0][0].data).toMatchObject({
      listingId: 'lst-1',
      organizationId: 'org-1',
      intent: EnquiryIntent.DEMO,
    });
    expect(prismaMock.lead.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        enquiryId: 'enq-2',
        listingId: 'lst-1',
        intent: EnquiryIntent.DEMO,
      },
    });
    expect(notifications.notifyEnquiryCreated).toHaveBeenCalledWith(
      expect.objectContaining({ partnerEmail: 'sales@partner.in' }),
    );
  });

  it('falls back to the admin queue when the listing is not publicly routable', async () => {
    prismaMock.partnerListing.findUnique.mockResolvedValue({
      id: 'lst-1',
      isPublished: false,
      reviewStatus: 'DRAFT',
      organization: approvedOrg,
    });
    prismaMock.enquiry.create.mockResolvedValue(mockEnquiry);

    await service.create({ ...baseDto, listingId: 'lst-1' });

    expect(prismaMock.enquiry.create.mock.calls[0][0].data).toMatchObject({
      listingId: null,
      organizationId: null,
    });
    expect(prismaMock.lead.create).not.toHaveBeenCalled();
  });

  it('routes partner-context enquiries only to verified organizations', async () => {
    prismaMock.organization.findUnique.mockResolvedValue({
      ...approvedOrg,
      verificationStatus: VerificationStatus.SUBMITTED,
    });
    prismaMock.enquiry.create.mockResolvedValue(mockEnquiry);

    await service.create({ ...baseDto, organizationId: 'org-1' });
    expect(prismaMock.lead.create).not.toHaveBeenCalled();

    prismaMock.organization.findUnique.mockResolvedValue(approvedOrg);
    prismaMock.enquiry.create.mockResolvedValue({
      ...mockEnquiry,
      id: 'enq-3',
      organizationId: 'org-1',
      intent: EnquiryIntent.PARTNER,
    });
    await service.create({ ...baseDto, organizationId: 'org-1' });
    expect(prismaMock.lead.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.enquiry.create.mock.calls[1][0].data.intent).toBe(
      EnquiryIntent.PARTNER,
    );
  });

  it('lists enquiries with filters, pagination and status counts', async () => {
    prismaMock.enquiry.findMany.mockResolvedValue([mockEnquiry]);
    prismaMock.enquiry.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    prismaMock.enquiry.groupBy.mockResolvedValue([
      { status: EnquiryStatus.NEW, _count: { _all: 3 } },
      { status: EnquiryStatus.CLOSED, _count: { _all: 2 } },
    ]);

    const result = await service.listForAdmin({
      take: 10,
      skip: 0,
      intent: EnquiryIntent.SERVICE,
      routing: 'UNROUTED',
    });

    expect(prismaMock.enquiry.findMany.mock.calls[0][0].where).toEqual({
      intent: EnquiryIntent.SERVICE,
      organizationId: null,
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.unroutedNew).toBe(1);
    expect(result.statusCounts).toEqual({ NEW: 3, READ: 0, CLOSED: 2 });
  });

  it('updates enquiry status', async () => {
    prismaMock.enquiry.update.mockResolvedValue({
      ...mockEnquiry,
      status: EnquiryStatus.READ,
    });

    const updated = await service.updateStatus('enq-1', {
      status: EnquiryStatus.READ,
    });

    expect(updated.status).toBe(EnquiryStatus.READ);
  });

  it('throws when enquiry id is missing on status update', async () => {
    const { Prisma } = await import('@prisma/client');
    prismaMock.enquiry.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.updateStatus('missing', { status: EnquiryStatus.READ }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('bulk updates status', async () => {
    prismaMock.enquiry.updateMany.mockResolvedValue({ count: 2 });
    const res = await service.bulkUpdateStatus({
      ids: ['a', 'b'],
      status: EnquiryStatus.CLOSED,
    });
    expect(res).toEqual({ updated: 2 });
    expect(prismaMock.enquiry.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] } },
      data: { status: EnquiryStatus.CLOSED },
    });
  });

  describe('assign', () => {
    it('routes to a verified partner, upserts the lead and notifies', async () => {
      prismaMock.enquiry.findUnique.mockResolvedValue(mockEnquiry);
      prismaMock.organization.findUnique.mockResolvedValue(approvedOrg);
      prismaMock.enquiry.update.mockResolvedValue({
        ...mockEnquiry,
        organizationId: 'org-1',
      });

      await service.assign('enq-1', 'admin-1', { organizationId: 'org-1' });

      expect(prismaMock.lead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { enquiryId: 'enq-1' },
          create: expect.objectContaining({ organizationId: 'org-1' }),
          update: expect.objectContaining({
            organizationId: 'org-1',
            status: LeadStatus.NEW,
          }),
        }),
      );
      expect(notifications.notifyEnquiryRouted).toHaveBeenCalledTimes(1);
    });

    it('does not renotify or reset the lead when the org is unchanged', async () => {
      prismaMock.enquiry.findUnique.mockResolvedValue({
        ...mockEnquiry,
        organizationId: 'org-1',
      });
      prismaMock.organization.findUnique.mockResolvedValue(approvedOrg);
      prismaMock.enquiry.update.mockResolvedValue(mockEnquiry);

      await service.assign('enq-1', 'admin-1', { organizationId: 'org-1' });

      expect(prismaMock.lead.upsert.mock.calls[0][0].update).toEqual({});
      expect(notifications.notifyEnquiryRouted).not.toHaveBeenCalled();
    });

    it('rejects unverified partners', async () => {
      prismaMock.enquiry.findUnique.mockResolvedValue(mockEnquiry);
      prismaMock.organization.findUnique.mockResolvedValue({
        ...approvedOrg,
        verificationStatus: VerificationStatus.DRAFT,
      });
      await expect(
        service.assign('enq-1', 'admin-1', { organizationId: 'org-1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns the enquiry to the queue and removes the lead when unassigned', async () => {
      prismaMock.enquiry.findUnique.mockResolvedValue({
        ...mockEnquiry,
        organizationId: 'org-1',
      });
      prismaMock.enquiry.update.mockResolvedValue(mockEnquiry);

      await service.assign('enq-1', 'admin-1', { organizationId: null });

      expect(prismaMock.lead.deleteMany).toHaveBeenCalledWith({
        where: { enquiryId: 'enq-1' },
      });
      expect(prismaMock.enquiry.update.mock.calls[0][0].data).toEqual({
        organizationId: null,
        routedAt: null,
        routedByUserId: null,
      });
    });

    it('404s for unknown enquiries', async () => {
      prismaMock.enquiry.findUnique.mockResolvedValue(null);
      await expect(
        service.assign('nope', 'admin-1', { organizationId: 'org-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

describe('LeadService', () => {
  let service: LeadService;
  const prismaMock = {
    organization: { findUnique: jest.fn() },
    lead: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LeadService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(LeadService);
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1' });
  });

  it('scopes the partner inbox to the partner organization and returns counts', async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);
    prismaMock.lead.count.mockResolvedValue(0);
    prismaMock.lead.groupBy.mockResolvedValue([
      { status: LeadStatus.NEW, _count: { _all: 4 } },
    ]);

    const res = await service.listForPartner('user-1', {
      status: LeadStatus.NEW,
    });

    expect(prismaMock.lead.findMany.mock.calls[0][0].where).toEqual({
      organizationId: 'org-1',
      status: LeadStatus.NEW,
    });
    expect(res.statusCounts.NEW).toBe(4);
    expect(res.statusCounts.WON).toBe(0);
  });

  it('rejects updates to leads owned by another organization', async () => {
    prismaMock.lead.findFirst.mockResolvedValue(null);
    await expect(
      service.updateForPartner('user-1', 'lead-9', {
        status: LeadStatus.CONTACTED,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.lead.findFirst).toHaveBeenCalledWith({
      where: { id: 'lead-9', organizationId: 'org-1' },
    });
  });

  it('stamps contactedAt on the first non-NEW transition', async () => {
    prismaMock.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      contactedAt: null,
    });
    prismaMock.lead.update.mockResolvedValue({ id: 'lead-1' });

    await service.updateForPartner('user-1', 'lead-1', {
      status: LeadStatus.CONTACTED,
      partnerNote: ' called ',
    });

    const data = prismaMock.lead.update.mock.calls[0][0].data;
    expect(data.status).toBe(LeadStatus.CONTACTED);
    expect(data.partnerNote).toBe('called');
    expect(data.contactedAt).toBeInstanceOf(Date);
  });
});
