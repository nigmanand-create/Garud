import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FulfillmentStatus, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CheckoutService } from './checkout.service';
import { UpdateOrderFulfillmentDto } from './dto/update-fulfillment.dto';

const orderDetailInclude = {
  vendorOrganization: { select: { id: true, companyName: true } },
  lineItems: {
    include: {
      listing: {
        select: {
          id: true,
          name: true,
          sku: true,
          primaryImageUrl: true,
        },
      },
    },
  },
  transactions: {
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checkoutService: CheckoutService,
  ) {}

  listBuyerOrders(buyerUserId: string) {
    return this.prisma.order
      .findMany({
        where: { buyerUserId },
        orderBy: { placedAt: 'desc' },
        include: {
          vendorOrganization: { select: { companyName: true } },
          _count: { select: { lineItems: true } },
        },
      })
      .then((rows) =>
        rows.map((o) => ({
          id: o.id,
          status: o.status,
          fulfillmentStatus: o.fulfillmentStatus,
          paymentStatus: o.paymentStatus,
          placedAt: o.placedAt.toISOString(),
          totalInr: o.totalInr.toFixed(2),
          vendorCompanyName: o.vendorOrganization.companyName,
          lineItemCount: o._count.lineItems,
        })),
      );
  }

  async getBuyerOrder(buyerUserId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerUserId },
      include: orderDetailInclude,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.checkoutService.serializeOrder(order);
  }

  listPartnerOrders(partnerUserId: string) {
    return this.prisma.organization
      .findUnique({ where: { ownerId: partnerUserId } })
      .then(async (org) => {
        if (!org) {
          throw new NotFoundException('Partner organization not found');
        }
        const rows = await this.prisma.order.findMany({
          where: { vendorOrganizationId: org.id },
          orderBy: { placedAt: 'desc' },
          include: {
            buyerOrganization: { select: { companyName: true } },
            _count: { select: { lineItems: true } },
          },
        });
        return rows.map((o) => ({
          id: o.id,
          status: o.status,
          fulfillmentStatus: o.fulfillmentStatus,
          paymentStatus: o.paymentStatus,
          placedAt: o.placedAt.toISOString(),
          totalInr: o.totalInr.toFixed(2),
          buyerCompanyName: o.buyerOrganization.companyName,
          lineItemCount: o._count.lineItems,
        }));
      });
  }

  async updatePartnerOrderFulfillment(
    partnerUserId: string,
    orderId: string,
    payload: UpdateOrderFulfillmentDto | FulfillmentStatus,
  ) {
    const dto: UpdateOrderFulfillmentDto =
      typeof payload === 'string' ? { fulfillmentStatus: payload } : payload;

    const org = await this.prisma.organization.findUnique({
      where: { ownerId: partnerUserId },
    });
    if (!org) {
      throw new NotFoundException('Partner organization not found');
    }
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, vendorOrganizationId: org.id },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new UnprocessableEntityException(
        'Cannot update fulfillment on a cancelled order',
      );
    }

    const now = new Date();
    const updateData: Prisma.OrderUpdateInput = {
      fulfillmentStatus: dto.fulfillmentStatus,
    };

    if (dto.carrierName !== undefined) {
      updateData.carrierName = dto.carrierName?.trim() || null;
    }
    if (dto.trackingNumber !== undefined) {
      updateData.trackingNumber = dto.trackingNumber?.trim() || null;
    }
    if (dto.trackingUrl !== undefined) {
      updateData.trackingUrl = dto.trackingUrl?.trim() || null;
    }
    if (dto.fulfillmentNotes !== undefined) {
      updateData.fulfillmentNotes = dto.fulfillmentNotes?.trim() || null;
    }
    if (dto.hardwareSerialNumbers !== undefined) {
      updateData.hardwareSerialNumbers = dto.hardwareSerialNumbers;
    }
    if (dto.estimatedDeliveryAt !== undefined) {
      updateData.estimatedDeliveryAt = dto.estimatedDeliveryAt
        ? new Date(dto.estimatedDeliveryAt)
        : null;
    }

    if (
      dto.fulfillmentStatus === FulfillmentStatus.SHIPPED &&
      !order.dispatchedAt
    ) {
      updateData.dispatchedAt = now;
    }
    if (dto.fulfillmentStatus === FulfillmentStatus.FULFILLED) {
      if (!order.dispatchedAt) {
        updateData.dispatchedAt = now;
      }
      if (!order.deliveredAt) {
        updateData.deliveredAt = now;
      }
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: orderDetailInclude,
    });
    return this.checkoutService.serializeOrder(updated);
  }

  async getPartnerOrder(partnerUserId: string, orderId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: partnerUserId },
    });
    if (!org) {
      throw new NotFoundException('Partner organization not found');
    }
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, vendorOrganizationId: org.id },
      include: orderDetailInclude,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.checkoutService.serializeOrder(order);
  }
}
