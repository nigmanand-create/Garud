import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ServiceMatchStatus,
  ServiceRequestCategory,
  ServiceRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { ServiceRequestsService } from './service-requests.service';

describe('ServiceRequestsService', () => {
  let service: ServiceRequestsService;

  const request = {
    id: 'req-1',
    trackingToken: 'tok',
    requesterName: 'Asha',
    requesterEmail: 'asha@example.com',
    requesterPhone: '999',
    category: ServiceRequestCategory.REPAIR_AMC,
    title: 'Crash repair',
    description: 'Arm broken after crash',
    state: 'Karnataka',
    city: 'Bengaluru',
    details: null,
    status: ServiceRequestStatus.SUBMITTED,
    assignedOrganizationId: null,
    enquiryId: null,
    matchScope: null,
    matches: [] as { organizationId: string }[],
  };

  const prismaMock = {
    serviceRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    serviceRequestMatch: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    serviceRequestUpdate: { create: jest.fn() },
    organization: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    enquiry: { update: jest.fn() },
    lead: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };
  const notifications = {
    notifyServiceRequestMatched: jest.fn().mockResolvedValue(undefined),
    notifyServiceRequestStatus: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    notifications.notifyServiceRequestMatched.mockResolvedValue(undefined);
    notifications.notifyServiceRequestStatus.mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock),
    );
    const module = await Test.createTestingModule({
      providers: [
        ServiceRequestsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compile();
    service = module.get(ServiceRequestsService);
  });

  const org = (id: string, over: object = {}) => ({
    id,
    state: 'Karnataka',
    serviceStates: [],
    serviceCategories: [ServiceRequestCategory.REPAIR_AMC],
    companyName: `Org ${id}`,
    contactEmail: `${id}@x.in`,
    ownerId: `u-${id}`,
    ...over,
  });

  describe('create + match', () => {
    it('creates the request and offers it to in-state verified providers', async () => {
      prismaMock.serviceRequest.create.mockResolvedValue({ id: 'req-1' });
      prismaMock.serviceRequest.findUnique.mockResolvedValue(request);
      prismaMock.organization.findMany.mockResolvedValue([
        org('o1'),
        org('o2', { state: 'Delhi' }),
      ]);
      prismaMock.serviceRequest.update.mockResolvedValue({
        ...request,
        status: ServiceRequestStatus.MATCHED,
      });

      const res = await service.create({
        name: 'Asha',
        email: 'ASHA@example.com',
        category: ServiceRequestCategory.REPAIR_AMC,
        title: 'Crash repair',
        description: 'Arm broken after crash',
        state: 'Karnataka',
      });

      expect(
        prismaMock.serviceRequest.create.mock.calls[0][0].data,
      ).toMatchObject({
        requesterEmail: 'asha@example.com',
        category: ServiceRequestCategory.REPAIR_AMC,
      });
      // category + verified filter is pushed to the query
      const where = prismaMock.organization.findMany.mock.calls[0][0].where;
      expect(where.verificationStatus).toBe('APPROVED');
      expect(where.OR[0]).toEqual({
        serviceCategories: { has: ServiceRequestCategory.REPAIR_AMC },
      });
      expect(where.OR[1].listings.some.category.in).toEqual([
        'REPAIR_MAINTENANCE',
      ]);

      expect(prismaMock.serviceRequestMatch.createMany).toHaveBeenCalledWith({
        data: [{ requestId: 'req-1', organizationId: 'o1' }],
        skipDuplicates: true,
      });
      expect(prismaMock.serviceRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: ServiceRequestStatus.MATCHED, matchScope: 'STATE' },
      });
      expect(notifications.notifyServiceRequestMatched).toHaveBeenCalledWith(
        expect.objectContaining({
          recipients: [expect.objectContaining({ email: 'o1@x.in' })],
        }),
      );
      expect(res.status).toBe(ServiceRequestStatus.MATCHED);
    });

    it('leaves the request SUBMITTED for admin triage when nobody matches', async () => {
      prismaMock.serviceRequest.create.mockResolvedValue({ id: 'req-1' });
      prismaMock.serviceRequest.findUnique.mockResolvedValue(request);
      prismaMock.organization.findMany.mockResolvedValue([]);
      prismaMock.serviceRequest.update.mockResolvedValue({
        ...request,
        matchScope: 'NONE',
      });

      const res = await service.create({
        name: 'Asha',
        email: 'a@x.in',
        category: ServiceRequestCategory.SCRAP_RECYCLING,
        title: 'Scrap valuation',
        description: 'Ten old batteries',
      });

      expect(prismaMock.serviceRequestMatch.createMany).not.toHaveBeenCalled();
      expect(res.status).toBe(ServiceRequestStatus.SUBMITTED);
      expect(notifications.notifyServiceRequestMatched).not.toHaveBeenCalled();
    });
  });

  describe('partner inbox', () => {
    beforeEach(() => {
      prismaMock.organization.findUnique.mockResolvedValue({
        id: 'o1',
        companyName: 'Org o1',
        serviceCategories: [],
        serviceStates: [],
        state: 'Karnataka',
      });
    });

    it('hides requester contact until the partner accepts', async () => {
      prismaMock.serviceRequestMatch.findMany.mockResolvedValue([
        {
          id: 'm1',
          status: ServiceMatchStatus.OFFERED,
          createdAt: new Date(),
          request: { ...request, updates: [] },
        },
        {
          id: 'm2',
          status: ServiceMatchStatus.ACCEPTED,
          createdAt: new Date(),
          request: { ...request, id: 'req-2', updates: [] },
        },
      ]);
      prismaMock.serviceRequestMatch.count.mockResolvedValue(1);

      const res = await service.listForPartner('user-1');
      expect(res.items[0].request.requesterEmail).toBeNull();
      expect(res.items[0].request.requesterPhone).toBeNull();
      expect(res.items[1].request.requesterEmail).toBe('asha@example.com');
      expect(res.counts).toEqual({ offered: 1, active: 1, closed: 1 });
    });

    it('accept connects the partner, withdraws other offers and routes the lead', async () => {
      const matched = {
        ...request,
        status: ServiceRequestStatus.MATCHED,
        enquiryId: 'enq-1',
      };
      prismaMock.serviceRequestMatch.findUnique.mockResolvedValue({
        id: 'm1',
        status: ServiceMatchStatus.OFFERED,
        request: matched,
      });
      prismaMock.serviceRequest.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.serviceRequest.findUniqueOrThrow.mockResolvedValue({
        ...matched,
        status: ServiceRequestStatus.IN_PROGRESS,
      });
      prismaMock.enquiry.update.mockResolvedValue({
        id: 'enq-1',
        intent: 'REPAIR',
      });
      prismaMock.serviceRequestMatch.findUniqueOrThrow.mockResolvedValue({
        id: 'm1',
        status: ServiceMatchStatus.ACCEPTED,
        request: matched,
      });

      await service.accept('user-1', 'req-1');

      expect(prismaMock.serviceRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'req-1', status: ServiceRequestStatus.MATCHED },
        data: expect.objectContaining({
          status: ServiceRequestStatus.IN_PROGRESS,
          assignedOrganizationId: 'o1',
        }),
      });
      expect(prismaMock.serviceRequestMatch.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ServiceMatchStatus.WITHDRAWN },
        }),
      );
      expect(prismaMock.lead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            organizationId: 'o1',
            intent: 'REPAIR',
          }),
        }),
      );
      expect(notifications.notifyServiceRequestStatus).toHaveBeenCalledWith(
        expect.objectContaining({ status: ServiceRequestStatus.IN_PROGRESS }),
      );
    });

    it('accept loses the race when another partner already took the job', async () => {
      prismaMock.serviceRequestMatch.findUnique.mockResolvedValue({
        id: 'm1',
        status: ServiceMatchStatus.OFFERED,
        request: { ...request, status: ServiceRequestStatus.IN_PROGRESS },
      });
      await expect(service.accept('user-1', 'req-1')).rejects.toBeInstanceOf(
        ConflictException,
      );

      prismaMock.serviceRequestMatch.findUnique.mockResolvedValue({
        id: 'm1',
        status: ServiceMatchStatus.OFFERED,
        request: { ...request, status: ServiceRequestStatus.MATCHED },
      });
      prismaMock.serviceRequest.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.accept('user-1', 'req-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects accept for requests not offered to the partner', async () => {
      prismaMock.serviceRequestMatch.findUnique.mockResolvedValue(null);
      await expect(service.accept('user-1', 'nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      prismaMock.serviceRequestMatch.findUnique.mockResolvedValue({
        id: 'm1',
        status: ServiceMatchStatus.DECLINED,
        request,
      });
      await expect(service.accept('user-1', 'req-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('returns the request to admin triage when every provider declined', async () => {
      prismaMock.serviceRequestMatch.findUnique.mockResolvedValue({
        id: 'm1',
        status: ServiceMatchStatus.OFFERED,
        request: { ...request, status: ServiceRequestStatus.MATCHED },
      });
      prismaMock.serviceRequestMatch.count.mockResolvedValue(0);

      await service.decline('user-1', 'req-1');

      expect(prismaMock.serviceRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: ServiceRequestStatus.SUBMITTED, matchScope: 'NONE' },
      });
    });

    it('keeps the request MATCHED while other offers are open', async () => {
      prismaMock.serviceRequestMatch.findUnique.mockResolvedValue({
        id: 'm1',
        status: ServiceMatchStatus.OFFERED,
        request: { ...request, status: ServiceRequestStatus.MATCHED },
      });
      prismaMock.serviceRequestMatch.count.mockResolvedValue(2);
      await service.decline('user-1', 'req-1');
      expect(prismaMock.serviceRequest.update).not.toHaveBeenCalled();
    });
  });

  describe('partner job updates', () => {
    beforeEach(() => {
      prismaMock.organization.findUnique.mockResolvedValue({
        id: 'o1',
        companyName: 'Org o1',
        serviceCategories: [],
        serviceStates: [],
        state: null,
      });
    });

    it('only the assigned partner can update the job', async () => {
      prismaMock.serviceRequest.findUnique.mockResolvedValue({
        ...request,
        status: ServiceRequestStatus.IN_PROGRESS,
        assignedOrganizationId: 'someone-else',
      });
      await expect(
        service.partnerUpdate('user-1', 'req-1', {
          status: ServiceRequestStatus.COMPLETED,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('marks an in-progress job completed', async () => {
      const inProgress = {
        ...request,
        status: ServiceRequestStatus.IN_PROGRESS,
        assignedOrganizationId: 'o1',
      };
      prismaMock.serviceRequest.findUnique.mockResolvedValue(inProgress);
      prismaMock.serviceRequest.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.serviceRequest.findUniqueOrThrow.mockResolvedValue({
        ...inProgress,
        status: ServiceRequestStatus.COMPLETED,
      });
      prismaMock.serviceRequestMatch.findUniqueOrThrow.mockResolvedValue({
        id: 'm1',
        status: ServiceMatchStatus.ACCEPTED,
        request: inProgress,
      });

      await service.partnerUpdate('user-1', 'req-1', {
        status: ServiceRequestStatus.COMPLETED,
        note: 'Replaced arm',
      });

      expect(
        prismaMock.serviceRequest.updateMany.mock.calls[0][0].data,
      ).toMatchObject({ status: ServiceRequestStatus.COMPLETED });
      expect(prismaMock.serviceRequestUpdate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actor: 'PARTNER',
          status: ServiceRequestStatus.COMPLETED,
          note: 'Replaced arm',
        }),
      });
    });

    it('rejects partner attempts to cancel or skip steps', async () => {
      prismaMock.serviceRequest.findUnique.mockResolvedValue({
        ...request,
        status: ServiceRequestStatus.IN_PROGRESS,
        assignedOrganizationId: 'o1',
      });
      await expect(
        service.partnerUpdate('user-1', 'req-1', {
          status: ServiceRequestStatus.CANCELLED,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.partnerUpdate('user-1', 'req-1', {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('admin', () => {
    it('assigns only to verified partners and withdraws other offers', async () => {
      prismaMock.serviceRequest.findUnique.mockResolvedValue(request);
      prismaMock.organization.findUnique.mockResolvedValue({
        id: 'o9',
        companyName: 'Org 9',
        contactEmail: 'o9@x.in',
        ownerId: 'u9',
        verificationStatus: 'SUBMITTED',
      });
      await expect(
        service.adminAssign('req-1', 'admin', { organizationId: 'o9' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      prismaMock.organization.findUnique.mockResolvedValue({
        id: 'o9',
        companyName: 'Org 9',
        contactEmail: 'o9@x.in',
        ownerId: 'u9',
        verificationStatus: 'APPROVED',
      });
      prismaMock.serviceRequest.update.mockResolvedValue({
        ...request,
        status: ServiceRequestStatus.MATCHED,
      });
      await service.adminAssign('req-1', 'admin', { organizationId: 'o9' });
      expect(prismaMock.serviceRequestMatch.upsert).toHaveBeenCalled();
      expect(prismaMock.serviceRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: ServiceRequestStatus.MATCHED, matchScope: 'ADMIN' },
      });
      expect(notifications.notifyServiceRequestMatched).toHaveBeenCalled();
    });

    it('admin can only cancel or complete; completion needs an assignee', async () => {
      prismaMock.serviceRequest.findUnique.mockResolvedValue(request);
      await expect(
        service.adminSetStatus('req-1', 'admin', {
          status: ServiceRequestStatus.IN_PROGRESS,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.adminSetStatus('req-1', 'admin', {
          status: ServiceRequestStatus.COMPLETED,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('public tracking', () => {
    it('shows the provider only once connected and never leaks contact data', async () => {
      prismaMock.serviceRequest.findUnique.mockResolvedValue({
        ...request,
        status: ServiceRequestStatus.MATCHED,
        createdAt: new Date(),
        completedAt: null,
        assignedOrganization: { companyName: 'Secret Co' },
        updates: [],
      });
      const matched = await service.getByToken('tok');
      expect(matched.provider).toBeNull();
      expect(JSON.stringify(matched)).not.toContain('asha@example.com');

      prismaMock.serviceRequest.findUnique.mockResolvedValue({
        ...request,
        status: ServiceRequestStatus.IN_PROGRESS,
        createdAt: new Date(),
        completedAt: null,
        assignedOrganization: { companyName: 'Secret Co' },
        updates: [],
      });
      const live = await service.getByToken('tok');
      expect(live.provider).toBe('Secret Co');
    });
  });
});
