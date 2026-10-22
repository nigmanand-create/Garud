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
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreateRfqDto,
  SubmitQuotationDto,
  AcceptQuotationDto,
  RejectQuotationDto,
} from './dto/rfq.dto';
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

    if (dto.deadlineAt && new Date(dto.deadlineAt) <= new Date()) {
      throw new BadRequestException('RFQ deadline must be in the future');
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
        orders: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            fulfillmentStatus: true,
            totalInr: true,
            quotationId: true,
            placedAt: true,
          },
        },
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
        status: { not: QuotationStatus.WITHDRAWN },
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

  async acceptQuotation(
    buyerUserId: string,
    rfqId: string,
    quotationId: string,
    dto: AcceptQuotationDto = {},
  ) {
    const rfq = await this.prisma.rfq.findFirst({
      where: { id: rfqId },
      include: {
        buyerOrganization: true,
        buyerUser: true,
      },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    if (rfq.buyerUserId !== buyerUserId) {
      throw new ForbiddenException('You can only manage your own RFQs');
    }
    if (rfq.status !== RfqStatus.OPEN) {
      throw new BadRequestException('RFQ is no longer open');
    }

    const quotation = await this.prisma.quotation.findFirst({
      where: {
        id: quotationId,
        rfqId,
      },
      include: {
        vendorOrganization: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found for this RFQ');
    }
    if (quotation.status !== QuotationStatus.SUBMITTED) {
      throw new BadRequestException(
        `Quotation cannot be accepted because it is ${quotation.status}`,
      );
    }
    if (quotation.priceOnRequest || quotation.priceInr == null) {
      throw new BadRequestException(
        'Cannot place an order on a Price-on-Request quotation without a specified price',
      );
    }

    // Resolve Shipping & Billing addresses
    const buyerOrg = rfq.buyerOrganization;
    const shipping = {
      companyName: dto.shipping?.companyName || buyerOrg.companyName,
      contactName:
        dto.shipping?.contactName ||
        buyerOrg.contactPersonName ||
        'Procurement Officer',
      contactPhone:
        dto.shipping?.contactPhone || buyerOrg.contactMobile || '0000000000',
      addressLine1: dto.shipping?.addressLine1 || 'Corporate Headquarters',
      addressLine2: dto.shipping?.addressLine2 || undefined,
      city: dto.shipping?.city || buyerOrg.city || 'Bengaluru',
      state: dto.shipping?.state || buyerOrg.state || 'Karnataka',
      pincode: dto.shipping?.pincode || '560001',
      country: dto.shipping?.country || buyerOrg.country || 'India',
    };

    const billing =
      dto.billingSameAsShipping !== false && !dto.billing
        ? shipping
        : {
            companyName: dto.billing?.companyName || shipping.companyName,
            contactName: dto.billing?.contactName || shipping.contactName,
            contactPhone: dto.billing?.contactPhone || shipping.contactPhone,
            addressLine1: dto.billing?.addressLine1 || shipping.addressLine1,
            addressLine2: dto.billing?.addressLine2 || shipping.addressLine2,
            city: dto.billing?.city || shipping.city,
            state: dto.billing?.state || shipping.state,
            pincode: dto.billing?.pincode || shipping.pincode,
            country: dto.billing?.country || shipping.country,
          };

    const quantity = rfq.quantity && rfq.quantity > 0 ? rfq.quantity : 1;
    const unitPrice = quotation.priceInr;
    const subtotal = new Prisma.Decimal(unitPrice).mul(quantity);
    const tax = new Prisma.Decimal(0);
    const shippingFee = new Prisma.Decimal(0);
    const total = subtotal.add(tax).add(shippingFee);

    // Atomically accept quotation, reject others, close RFQ, and create Order
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark winning quotation as ACCEPTED
      const acceptedQuote = await tx.quotation.update({
        where: { id: quotationId },
        data: { status: QuotationStatus.ACCEPTED },
      });

      // 2. Mark other submitted quotations for this RFQ as REJECTED
      await tx.quotation.updateMany({
        where: {
          rfqId,
          id: { not: quotationId },
          status: QuotationStatus.SUBMITTED,
        },
        data: { status: QuotationStatus.REJECTED },
      });

      // 3. Mark RFQ as CLOSED
      await tx.rfq.update({
        where: { id: rfqId },
        data: {
          status: RfqStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      // 4. Create the Order
      const createdOrder = await tx.order.create({
        data: {
          buyerUserId,
          buyerOrganizationId: rfq.buyerOrganizationId,
          vendorOrganizationId: quotation.vendorOrganizationId,
          rfqId: rfq.id,
          quotationId: quotation.id,
          subtotalInr: subtotal,
          taxInr: tax,
          shippingInr: shippingFee,
          totalInr: total,
          companyName: shipping.companyName,
          contactName: shipping.contactName,
          contactPhone: shipping.contactPhone,
          shippingAddressLine1: shipping.addressLine1,
          shippingAddressLine2: shipping.addressLine2,
          shippingCity: shipping.city,
          shippingState: shipping.state,
          shippingPincode: shipping.pincode,
          shippingCountry: shipping.country,
          billingAddressLine1: billing.addressLine1,
          billingAddressLine2: billing.addressLine2,
          billingCity: billing.city,
          billingState: billing.state,
          billingPincode: billing.pincode,
          billingCountry: billing.country,
          gstin: dto.gstin || buyerOrg.gst || undefined,
          purchaseOrderNumber:
            dto.purchaseOrderNumber ||
            `PO-RFQ-${rfq.id.slice(0, 8).toUpperCase()}`,
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: FulfillmentStatus.PENDING,
          lineItems: {
            create: [
              {
                snapshotName: rfq.title,
                snapshotSku: `RFQ-${rfq.id.slice(0, 8).toUpperCase()}`,
                unitPriceInr: unitPrice,
                quantity,
                lineTotalInr: subtotal,
              },
            ],
          },
        },
        include: {
          vendorOrganization: { select: { id: true, companyName: true } },
          lineItems: true,
        },
      });

      return {
        order: createdOrder,
        quotation: acceptedQuote,
      };
    });

    return {
      success: true,
      message: 'Quotation accepted and order created successfully',
      orderId: result.order.id,
      order: result.order,
      quotation: result.quotation,
    };
  }

  async rejectQuotation(
    buyerUserId: string,
    rfqId: string,
    quotationId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dto: RejectQuotationDto = {},
  ) {
    const rfq = await this.prisma.rfq.findFirst({
      where: { id: rfqId },
    });
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }
    if (rfq.buyerUserId !== buyerUserId) {
      throw new ForbiddenException('You can only manage your own RFQs');
    }
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, rfqId },
    });
    if (!quotation) {
      throw new NotFoundException('Quotation not found for this RFQ');
    }
    if (quotation.status !== QuotationStatus.SUBMITTED) {
      throw new BadRequestException(
        `Quotation cannot be rejected because it is ${quotation.status}`,
      );
    }

    const updated = await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.REJECTED },
    });

    return {
      success: true,
      message: 'Quotation rejected',
      quotation: updated,
    };
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
    if (invite.rfq.deadlineAt && new Date() > new Date(invite.rfq.deadlineAt)) {
      throw new BadRequestException('RFQ submission deadline has expired');
    }
    if (invite.status === RfqInviteStatus.DECLINED) {
      throw new BadRequestException('You declined this RFQ');
    }

    if (dto.validUntil && new Date(dto.validUntil) <= new Date()) {
      throw new BadRequestException(
        'Quotation validity date must be in the future',
      );
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
      },
    });
    if (!quote) {
      throw new NotFoundException('Quotation not found');
    }
    if (quote.status === QuotationStatus.WITHDRAWN) {
      throw new BadRequestException('Quotation is already withdrawn');
    }
    if (quote.status === QuotationStatus.ACCEPTED) {
      throw new BadRequestException(
        'Cannot withdraw a quotation that has already been accepted and awarded',
      );
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
