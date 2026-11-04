import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PartnershipRequestStatus,
  PartnershipRequestType,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PartnershipsService } from './partnerships.service';

describe('PartnershipsService', () => {
  let service: PartnershipsService;

  const prismaMock = {
    organization: { findUnique: jest.fn() },
    partnershipRequest: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PartnershipsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(PartnershipsService);
    prismaMock.organization.findUnique.mockImplementation(
      ({ where }: { where: { ownerId?: string; id?: string } }) =>
        where.ownerId
          ? Promise.resolve({ id: 'org-1' })
          : Promise.resolve({
              id: where.id,
              verificationStatus: VerificationStatus.APPROVED,
            }),
    );
  });

  const dto = {
    type: PartnershipRequestType.DISTRIBUTORSHIP,
    title: 'South India distribution',
    message: 'We would like to distribute your range.',
  };

  it('creates a request for the partner organization', async () => {
    prismaMock.partnershipRequest.findFirst.mockResolvedValue(null);
    prismaMock.partnershipRequest.create.mockResolvedValue({ id: 'pr-1' });

    await service.create('user-1', dto);

    expect(prismaMock.partnershipRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          type: PartnershipRequestType.DISTRIBUTORSHIP,
          targetOrganizationId: null,
        }),
      }),
    );
  });

  it('rejects a duplicate open request', async () => {
    prismaMock.partnershipRequest.findFirst.mockResolvedValue({ id: 'pr-0' });
    await expect(service.create('user-1', dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaMock.partnershipRequest.create).not.toHaveBeenCalled();
  });

  it('rejects targeting own organization', async () => {
    await expect(
      service.create('user-1', { ...dto, targetOrganizationId: 'org-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only withdraws open requests owned by the org', async () => {
    prismaMock.partnershipRequest.findFirst.mockResolvedValueOnce(null);
    await expect(service.withdraw('user-1', 'x')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prismaMock.partnershipRequest.findFirst.mockResolvedValueOnce({
      id: 'pr-1',
      status: PartnershipRequestStatus.APPROVED,
    });
    await expect(service.withdraw('user-1', 'pr-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    prismaMock.partnershipRequest.findFirst.mockResolvedValueOnce({
      id: 'pr-2',
      status: PartnershipRequestStatus.SUBMITTED,
    });
    prismaMock.partnershipRequest.update.mockResolvedValue({ id: 'pr-2' });
    await service.withdraw('user-1', 'pr-2');
    expect(prismaMock.partnershipRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: PartnershipRequestStatus.WITHDRAWN },
      }),
    );
  });

  it('admin decision stamps reviewer and refuses withdrawn requests', async () => {
    prismaMock.partnershipRequest.findUnique.mockResolvedValueOnce({
      id: 'pr-1',
      status: PartnershipRequestStatus.WITHDRAWN,
    });
    await expect(
      service.decide('admin-1', 'pr-1', {
        status: PartnershipRequestStatus.APPROVED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prismaMock.partnershipRequest.findUnique.mockResolvedValueOnce({
      id: 'pr-2',
      status: PartnershipRequestStatus.SUBMITTED,
    });
    prismaMock.partnershipRequest.update.mockResolvedValue({ id: 'pr-2' });
    await service.decide('admin-1', 'pr-2', {
      status: PartnershipRequestStatus.APPROVED,
      adminNote: ' ok ',
    });
    expect(prismaMock.partnershipRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PartnershipRequestStatus.APPROVED,
          adminNote: 'ok',
          reviewedByUserId: 'admin-1',
        }),
      }),
    );
  });

  it('refuses SUBMITTED / WITHDRAWN as admin decisions', async () => {
    await expect(
      service.decide('admin-1', 'pr-1', {
        status: PartnershipRequestStatus.WITHDRAWN,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
