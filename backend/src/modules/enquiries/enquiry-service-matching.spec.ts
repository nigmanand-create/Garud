import { Test } from '@nestjs/testing';
import { EnquiryIntent, ServiceRequestCategory } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { ServiceRequestsService } from '../service-requests/service-requests.service';
import { EnquiryService } from './enquiry.service';

describe('EnquiryService → service matching (Phase 8)', () => {
  let service: EnquiryService;

  const stored = (over: object = {}) => ({
    id: 'enq-1',
    name: 'Asha',
    email: 'asha@example.com',
    phone: null,
    subject: 'Drone repair',
    message: 'Gimbal is broken after a crash.',
    sourcePage: null,
    intent: EnquiryIntent.REPAIR,
    serviceKey: 'repair',
    listingId: null,
    organizationId: null,
    routedAt: null,
    status: 'NEW',
    createdAt: new Date(),
    ...over,
  });

  const prismaMock = {
    enquiry: { create: jest.fn() },
    lead: { create: jest.fn() },
    partnerListing: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const notifications = {
    notifyEnquiryCreated: jest.fn().mockResolvedValue(undefined),
  };
  const serviceRequests = {
    create: jest.fn().mockResolvedValue({
      id: 'req-1',
      status: 'MATCHED',
      trackingToken: 'tok',
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    serviceRequests.create.mockResolvedValue({
      id: 'req-1',
      status: 'MATCHED',
      trackingToken: 'tok',
    });
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock),
    );
    const module = await Test.createTestingModule({
      providers: [
        EnquiryService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationService, useValue: notifications },
        { provide: ServiceRequestsService, useValue: serviceRequests },
      ],
    }).compile();
    service = module.get(EnquiryService);
  });

  const dto = {
    name: 'Asha',
    email: 'asha@example.com',
    subject: 'Drone repair',
    message: 'Gimbal is broken after a crash.',
  };

  it('Phase 1 repair enquiry gets a vertical lead type and enters matching', async () => {
    prismaMock.enquiry.create.mockResolvedValue(stored());

    await service.create({ ...dto, serviceKey: 'repair' });

    expect(prismaMock.enquiry.create.mock.calls[0][0].data.intent).toBe(
      EnquiryIntent.REPAIR,
    );
    expect(serviceRequests.create).toHaveBeenCalledWith(
      expect.objectContaining({
        category: ServiceRequestCategory.REPAIR_AMC,
        enquiryId: 'enq-1',
        title: 'Drone repair',
      }),
    );
  });

  it('does not match enquiries that are explicitly routed to a partner', async () => {
    prismaMock.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      companyName: 'P',
      contactEmail: 'p@x.in',
      ownerId: 'u1',
      verificationStatus: 'APPROVED',
    });
    prismaMock.enquiry.create.mockResolvedValue(
      stored({ organizationId: 'org-1' }),
    );
    prismaMock.lead.create.mockResolvedValue({});

    await service.create({
      ...dto,
      serviceKey: 'repair',
      organizationId: '2f4d6b8e-1111-4222-8333-444455556666',
    });

    expect(serviceRequests.create).not.toHaveBeenCalled();
  });

  it('does not match non-matchable verticals (training, compliance keeps matching)', async () => {
    prismaMock.enquiry.create.mockResolvedValue(
      stored({ serviceKey: 'training', intent: EnquiryIntent.TRAINING }),
    );
    await service.create({ ...dto, serviceKey: 'training' });
    expect(serviceRequests.create).not.toHaveBeenCalled();
    expect(prismaMock.enquiry.create.mock.calls[0][0].data.intent).toBe(
      EnquiryIntent.TRAINING,
    );
  });

  it('a matching failure never fails the enquiry', async () => {
    prismaMock.enquiry.create.mockResolvedValue(stored());
    serviceRequests.create.mockRejectedValue(new Error('boom'));
    await expect(
      service.create({ ...dto, serviceKey: 'repair' }),
    ).resolves.toMatchObject({ id: 'enq-1' });
  });

  it('submitServiceRequest creates one enquiry + one linked request (no double matching)', async () => {
    prismaMock.enquiry.create.mockResolvedValue(
      stored({
        subject: 'Scrap valuation',
        serviceKey: 'recycling',
        intent: EnquiryIntent.SCRAP,
      }),
    );

    const res = await service.submitServiceRequest(
      {
        ...dto,
        title: 'Scrap valuation',
        description: 'Ten old LiPo batteries and two frames',
        category: ServiceRequestCategory.SCRAP_RECYCLING,
        state: 'Goa',
        details: { quantity: 12, condition: 'damaged', 'bad key': 'x' },
      },
      'buyer-1',
    );

    const data = prismaMock.enquiry.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      intent: EnquiryIntent.SCRAP,
      serviceKey: 'recycling',
      organizationId: null,
    });
    expect(data.message).toContain('quantity: 12');
    expect(data.message).toContain('Location: Goa');
    expect(serviceRequests.create).toHaveBeenCalledTimes(1);
    expect(serviceRequests.create).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerUserId: 'buyer-1',
        enquiryId: 'enq-1',
        details: { quantity: 12, condition: 'damaged' },
      }),
    );
    expect(res).toEqual({
      enquiryId: 'enq-1',
      request: { id: 'req-1', status: 'MATCHED', trackingToken: 'tok' },
    });
  });
});
