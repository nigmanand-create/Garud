import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EnquiryStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EnquiryService } from './enquiry.service';

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
    status: EnquiryStatus.NEW,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prismaMock = {
    enquiry: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnquiryService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<EnquiryService>(EnquiryService);
  });

  it('creates an enquiry with trimmed fields', async () => {
    prismaMock.enquiry.create.mockResolvedValue(mockEnquiry);

    const result = await service.create({
      name: '  Test User  ',
      email: 'Test@Example.com',
      phone: ' +91 9999999999 ',
      subject: ' Compliance help ',
      message: 'Need DGCA UIN support for our fleet.',
      sourcePage: '/enquiry?service=compliance',
    });

    expect(prismaMock.enquiry.create).toHaveBeenCalledWith({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+91 9999999999',
        subject: 'Compliance help',
        message: 'Need DGCA UIN support for our fleet.',
        sourcePage: '/enquiry?service=compliance',
      },
    });
    expect(result).toEqual(mockEnquiry);
  });

  it('lists enquiries with pagination and status counts', async () => {
    prismaMock.enquiry.findMany.mockResolvedValue([mockEnquiry]);
    prismaMock.enquiry.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    const result = await service.listForAdmin({ take: 10, skip: 0 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.statusCounts).toEqual({ NEW: 1, READ: 0 });
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
});
