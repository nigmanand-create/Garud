import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TrainingBatchStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EnquiryService } from '../enquiries/enquiry.service';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { TrainingService } from './training.service';
import { formatInterestMessage, resolveBatchStatus } from './training.rules';

const institute: AuthenticatedUser = {
  userId: 'u1',
  email: 'i@x.in',
  role: 'PARTNER',
  accountType: 'TRAINING_INSTITUTE',
};

describe('training rules', () => {
  it('derives FULL / OPEN from seats and respects manual close', () => {
    expect(resolveBatchStatus(undefined, 20, 20)).toBe(
      TrainingBatchStatus.FULL,
    );
    expect(resolveBatchStatus(TrainingBatchStatus.FULL, 20, 5)).toBe(
      TrainingBatchStatus.OPEN,
    );
    expect(resolveBatchStatus(TrainingBatchStatus.CLOSED, 20, 5)).toBe(
      TrainingBatchStatus.CLOSED,
    );
    expect(resolveBatchStatus(TrainingBatchStatus.COMPLETED, 20, 20)).toBe(
      TrainingBatchStatus.COMPLETED,
    );
  });

  it('formats the interest message', () => {
    expect(
      formatInterestMessage({
        courseTitle: 'RPC Small',
        batchLabel: '2026-12-01 — Pune',
        message: 'Need weekend slot',
      }),
    ).toBe(
      'Interested in: RPC Small\nPreferred batch: 2026-12-01 — Pune\n\nNeed weekend slot',
    );
  });
});

describe('TrainingService', () => {
  let service: TrainingService;
  const prismaStudent = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    update: jest.fn(),
  };
  const prismaMock = {
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    lead: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    organization: { findUnique: jest.fn() },
    instituteProfile: { findUnique: jest.fn(), upsert: jest.fn() },
    studentTrainingLead: prismaStudent,
    trainingCourse: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    trainingBatch: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const enquiries = { create: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1' });
    const module = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EnquiryService, useValue: enquiries },
      ],
    }).compile();
    service = module.get(TrainingService);
  });

  it('only training institutes can manage courses', async () => {
    await expect(
      service.createCourse(
        { ...institute, accountType: 'DEALER' },
        { title: 'X course' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a course for the institute organization (unpublished by default)', async () => {
    prismaMock.trainingCourse.create.mockResolvedValue({ id: 'c1' });
    await service.createCourse(institute, {
      title: ' RPC Small ',
      feeInr: 25000,
    });
    expect(
      prismaMock.trainingCourse.create.mock.calls[0][0].data,
    ).toMatchObject({
      organizationId: 'org-1',
      title: 'RPC Small',
      feeInr: 25000,
      isPublished: false,
    });
  });

  it('scopes batch edits to the institute and validates seats / dates', async () => {
    prismaMock.trainingCourse.findFirst.mockResolvedValue({ id: 'c1' });
    await expect(
      service.createBatch(institute, 'c1', {
        startDate: '2026-12-10',
        endDate: '2026-12-01',
        seats: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createBatch(institute, 'c1', {
        startDate: '2026-12-01',
        seats: 10,
        seatsFilled: 11,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prismaMock.trainingBatch.create.mockResolvedValue({ id: 'b1' });
    await service.createBatch(institute, 'c1', {
      startDate: '2026-12-01',
      seats: 10,
      seatsFilled: 10,
    });
    expect(prismaMock.trainingBatch.create.mock.calls[0][0].data).toMatchObject(
      {
        courseId: 'c1',
        status: TrainingBatchStatus.FULL,
      },
    );

    prismaMock.trainingBatch.findFirst.mockResolvedValue(null);
    await expect(
      service.updateBatch(institute, 'foreign', { seats: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.trainingBatch.findFirst.mock.calls[0][0].where).toEqual({
      id: 'foreign',
      course: { organizationId: 'org-1' },
    });
  });

  it('course interest creates a TRAINING enquiry routed to the institute', async () => {
    const start = new Date('2026-12-01T00:00:00Z');
    prismaMock.trainingCourse.findFirst.mockResolvedValue({
      id: 'c1',
      title: 'RPC Small',
      organizationId: 'org-1',
      batches: [{ id: 'b1', startDate: start, city: 'Pune' }],
    });
    enquiries.create.mockResolvedValue({ id: 'e1', organizationId: 'org-1' });

    const res = await service.expressInterest('c1', {
      name: 'Ravi',
      email: 'ravi@x.in',
      batchId: 'b1',
    });

    expect(enquiries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'TRAINING',
        serviceKey: 'training',
        organizationId: 'org-1',
        subject: 'Course interest: RPC Small',
        message: expect.stringContaining('2026-12-01 — Pune'),
      }),
    );
    expect(res).toEqual({ id: 'e1', routed: true });
    expect(prismaStudent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        courseId: 'c1',
        batchId: 'b1',
        organizationId: 'org-1',
        email: 'ravi@x.in',
        userId: null,
      }),
    });
  });

  it('lists the institute student inbox with status counts', async () => {
    prismaStudent.findMany.mockResolvedValue([{ id: 'l1' }]);
    prismaStudent.count.mockResolvedValue(1);
    prismaStudent.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { _all: 1 } },
    ]);
    const res = await service.listStudentLeads(institute, { status: 'NEW' });
    expect(prismaStudent.findMany.mock.calls[0][0].where).toEqual({
      organizationId: 'org-1',
      status: 'NEW',
    });
    expect(res.statusCounts).toEqual({
      NEW: 1,
      CONTACTED: 0,
      ENROLLED: 0,
      CLOSED: 0,
    });
  });

  it('only updates student leads that belong to the institute', async () => {
    prismaStudent.findFirst.mockResolvedValue(null);
    await expect(
      service.updateStudentLead(institute, 'l9', { status: 'CONTACTED' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaStudent.findFirst).toHaveBeenCalledWith({
      where: { id: 'l9', organizationId: 'org-1' },
    });
    expect(prismaStudent.update).not.toHaveBeenCalled();
  });

  it('rejects interest for a batch that is not open on the course', async () => {
    prismaMock.trainingCourse.findFirst.mockResolvedValue({
      id: 'c1',
      title: 'RPC Small',
      organizationId: 'org-1',
      batches: [],
    });
    await expect(
      service.expressInterest('c1', {
        name: 'Ravi',
        email: 'ravi@x.in',
        batchId: '2f4d6b8e-1111-4222-8333-444455556666',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(enquiries.create).not.toHaveBeenCalled();
  });

  it('public course lookup only returns published courses of verified institutes', async () => {
    prismaMock.trainingCourse.findFirst.mockResolvedValue(null);
    await expect(service.getPublic('c9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.trainingCourse.findFirst.mock.calls[0][0].where).toEqual({
      id: 'c9',
      isPublished: true,
      organization: { verificationStatus: 'APPROVED' },
    });
  });
});
