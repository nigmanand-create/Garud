import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  QuotationStatus,
  RfqInviteStatus,
  RfqStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateRfqDto, SubmitQuotationDto } from './dto/rfq.dto';
import { RfqMatchingService } from './rfq-matching.service';

@Injectable()
export class RfqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: RfqMatchingService,
  ) {}

  async createRfq(buyerUserId: string, buyerRole: UserRole, dto: CreateRfqDto) {
    if (buyerRole !== UserRole.BUYER && buyerRole !== UserRole.GOVERNMENT) {
      throw new ForbiddenException('Only buyers can post RFQs');
    }

    const org = await this.prisma.organization.findUnique({
      where: { ownerId: buyerUserId },
    });
    if (!org) {
      throw new NotFoundException('Buyer organization not found');
    }

    const vendorIds = await this.matching.findVendorOrganizationIds(
      dto.category,
      dto.listingType,
    );

    return this.prisma.$transaction(async (tx) => {
      const rfq = await tx.rfq.create({
        data: {
          buyerUserId,
          buyerOrganizationId: org.id,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          listingType: dto.listingType,
          quantity: dto.quantity,
          country: dto.country,
          state: dto.state,
          city: dto.city,
          deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : undefined,
          status: RfqStatus.OPEN,
        },
      });

      if (vendorIds.length) {
        await tx.rfqInvite.createMany({
          data: vendorIds.map((vendorOrganizationId) => ({
            rfqId: rfq.id,
            vendorOrganizationId,
          })),
        });
      }

      return tx.rfq.findUniqueOrThrow({
        where: { id: rfq.id },
        include: {
          _count: { select: { invites: true, quotations: true } },
        },
      });
    });
  }

  listBuyerRfqs(buyerUserId: string) {
    return this.prisma.rfq.findMany({
      where: { buyerUserId },
      include: {
        _count: { select: { invites: true, quotations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBuyerRfq(buyerUserId: string, rfqId: string) {
    const rfq = await this.prisma.rfq.findFirst({
      where: { id: rfqId, buyerUserId },
      include: {
        _count: { select: { invites: true, quotations: true } },
      },
    });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    return rfq;
  }

  async compareQuotations(buyerUserId: string, rfqId: string) {
    await this.getBuyerRfq(buyerUserId, rfqId);

    return this.prisma.quotation.findMany({
      where: {
        rfqId,
        status: QuotationStatus.SUBMITTED,
      },
      include: {
        vendorOrganization: {
          select: {
            id: true,
            companyName: true,
            country: true,
            state: true,
            city: true,
            contactEmail: true,
            contactMobile: true,
            website: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async closeRfq(buyerUserId: string, rfqId: string) {
    const rfq = await this.getBuyerRfq(buyerUserId, rfqId);
    if (rfq.status !== RfqStatus.OPEN) {
      throw new BadRequestException('RFQ is not open');
    }
    return this.prisma.rfq.update({
      where: { id: rfqId },
      data: { status: RfqStatus.CLOSED, closedAt: new Date() },
    });
  }

  async cancelRfq(buyerUserId: string, rfqId: string) {
    const rfq = await this.getBuyerRfq(buyerUserId, rfqId);
    if (rfq.status !== RfqStatus.OPEN) {
      throw new BadRequestException('RFQ is not open');
    }
    return this.prisma.rfq.update({
      where: { id: rfqId },
      data: { status: RfqStatus.CANCELLED, closedAt: new Date() },
    });
  }

  async listPartnerRfqs(partnerUserId: string) {
    const org = await this.requirePartnerOrg(partnerUserId);

    return this.prisma.rfqInvite.findMany({
      where: {
        vendorOrganizationId: org.id,
        rfq: { status: RfqStatus.OPEN },
      },
      include: {
        rfq: {
          include: {
            buyerOrganization: {
              select: {
                id: true,
                companyName: true,
                country: true,
                state: true,
                city: true,
              },
            },
            quotations: {
              where: {
                vendorOrganizationId: org.id,
                status: QuotationStatus.SUBMITTED,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPartnerRfq(partnerUserId: string, rfqId: string) {
    const org = await this.requirePartnerOrg(partnerUserId);
    const invite = await this.prisma.rfqInvite.findFirst({
      where: { rfqId, vendorOrganizationId: org.id },
      include: {
        rfq: {
          include: {
            buyerOrganization: {
              select: {
                id: true,
                companyName: true,
                country: true,
                state: true,
                city: true,
              },
            },
          },
        },
      },
    });
    if (!invite) {
      throw new NotFoundException('RFQ not found or not assigned to you');
    }
    return invite;
  }

  async submitQuotation(
    partnerUserId: string,
    rfqId: string,
    dto: SubmitQuotationDto,
  ) {
    const org = await this.requirePartnerOrg(partnerUserId);
    const invite = await this.prisma.rfqInvite.findFirst({
      where: { rfqId, vendorOrganizationId: org.id },
      include: { rfq: true },
    });
    if (!invite) {
      throw new NotFoundException('RFQ not found or not assigned to you');
    }
    if (invite.rfq.status !== RfqStatus.OPEN) {
      throw new BadRequestException('RFQ is no longer open');
    }
    if (invite.status === RfqInviteStatus.DECLINED) {
      throw new BadRequestException('You declined this RFQ');
    }

    const priceOnRequest = dto.priceOnRequest ?? false;
    if (!priceOnRequest && (dto.priceInr == null || dto.priceInr < 0)) {
      throw new BadRequestException(
        'priceInr is required when priceOnRequest is false',
      );
    }

    const quotation = await this.prisma.$transaction(async (tx) => {
      await tx.quotation.updateMany({
        where: {
          rfqId,
          vendorOrganizationId: org.id,
          status: QuotationStatus.SUBMITTED,
        },
        data: { status: QuotationStatus.WITHDRAWN },
      });

      const created = await tx.quotation.create({
        data: {
          rfqId,
          vendorOrganizationId: org.id,
          submittedByUserId: partnerUserId,
          priceOnRequest,
          priceInr:
            !priceOnRequest && dto.priceInr != null
              ? new Prisma.Decimal(dto.priceInr)
              : null,
          minOrderQuantity: dto.minOrderQuantity,
          leadTimeDays: dto.leadTimeDays,
          notes: dto.notes,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        },
      });

      await tx.rfqInvite.update({
        where: { id: invite.id },
        data: { status: RfqInviteStatus.QUOTED },
      });

      return created;
    });

    return quotation;
  }

  async declineRfq(partnerUserId: string, rfqId: string) {
    const org = await this.requirePartnerOrg(partnerUserId);
    const invite = await this.prisma.rfqInvite.findFirst({
      where: { rfqId, vendorOrganizationId: org.id },
    });
    if (!invite) {
      throw new NotFoundException('RFQ not found or not assigned to you');
    }

    return this.prisma.rfqInvite.update({
      where: { id: invite.id },
      data: { status: RfqInviteStatus.DECLINED },
    });
  }

  async withdrawQuotation(partnerUserId: string, quotationId: string) {
    const org = await this.requirePartnerOrg(partnerUserId);
    const quote = await this.prisma.quotation.findFirst({
      where: {
        id: quotationId,
        vendorOrganizationId: org.id,
        status: QuotationStatus.SUBMITTED,
      },
    });
    if (!quote) {
      throw new NotFoundException('Quotation not found');
    }

    return this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.WITHDRAWN },
    });
  }

  private async requirePartnerOrg(partnerUserId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: partnerUserId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }
}
