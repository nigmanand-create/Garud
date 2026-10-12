import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CartService } from './cart.service';
import { CheckoutAddressDto, PlaceCheckoutDto } from './dto/commerce.dto';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  async placeOrder(
    buyerUserId: string,
    buyerRole: UserRole,
    dto: PlaceCheckoutDto,
  ) {
    if (buyerRole !== UserRole.BUYER && buyerRole !== UserRole.GOVERNMENT) {
      throw new UnprocessableEntityException('Only buyers can place orders');
    }

    const org = await this.prisma.organization.findUnique({
      where: { ownerId: buyerUserId },
    });
    if (!org) {
      throw new NotFoundException('Buyer organization not found');
    }

    const cart = await this.cartService.getCartForCheckout(buyerUserId);
    const billing = this.resolveBilling(dto);

    let subtotal = new Prisma.Decimal(0);
    const lineData = cart.items.map((item) => {
      const unit = item.listing.priceInr ?? new Prisma.Decimal(0);
      const lineTotal = unit.mul(item.quantity);
      subtotal = subtotal.add(lineTotal);
      return {
        listingId: item.listing.id,
        snapshotName: item.listing.name,
        snapshotSku: item.listing.sku,
        unitPriceInr: unit,
        quantity: item.quantity,
        lineTotalInr: lineTotal,
      };
    });

    const tax = new Prisma.Decimal(0);
    const shipping = new Prisma.Decimal(0);
    const total = subtotal.add(tax).add(shipping);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          buyerUserId,
          buyerOrganizationId: org.id,
          vendorOrganizationId: cart.partnerOrganizationId,
          subtotalInr: subtotal,
          taxInr: tax,
          shippingInr: shipping,
          totalInr: total,
          companyName: dto.shipping.companyName,
          contactName: dto.shipping.contactName,
          contactPhone: dto.shipping.contactPhone,
          shippingAddressLine1: dto.shipping.addressLine1,
          shippingAddressLine2: dto.shipping.addressLine2,
          shippingCity: dto.shipping.city,
          shippingState: dto.shipping.state,
          shippingPincode: dto.shipping.pincode,
          shippingCountry: dto.shipping.country,
          billingAddressLine1: billing.addressLine1,
          billingAddressLine2: billing.addressLine2,
          billingCity: billing.city,
          billingState: billing.state,
          billingPincode: billing.pincode,
          billingCountry: billing.country,
          gstin: dto.gstin,
          purchaseOrderNumber: dto.purchaseOrderNumber,
          lineItems: { create: lineData },
        },
        include: {
          vendorOrganization: { select: { id: true, companyName: true } },
          lineItems: true,
        },
      });

      await tx.cart.delete({ where: { id: cart.id } });
      return created;
    });

    return this.serializeOrder(order);
  }

  private resolveBilling(dto: PlaceCheckoutDto): CheckoutAddressDto {
    if (dto.billingSameAsShipping !== false && !dto.billing) {
      return dto.shipping;
    }
    if (dto.billing) {
      return dto.billing;
    }
    return dto.shipping;
  }

  serializeOrder(
    order: Prisma.OrderGetPayload<{
      include: {
        vendorOrganization: { select: { id: true; companyName: true } };
        lineItems: true;
      };
    }>,
  ) {
    return {
      id: order.id,
      status: order.status,
      fulfillmentStatus: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      placedAt: order.placedAt.toISOString(),
      subtotalInr: order.subtotalInr.toFixed(2),
      taxInr: order.taxInr.toFixed(2),
      shippingInr: order.shippingInr.toFixed(2),
      totalInr: order.totalInr.toFixed(2),
      companyName: order.companyName,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
      shipping: {
        addressLine1: order.shippingAddressLine1,
        addressLine2: order.shippingAddressLine2,
        city: order.shippingCity,
        state: order.shippingState,
        pincode: order.shippingPincode,
        country: order.shippingCountry,
      },
      billing: {
        addressLine1: order.billingAddressLine1,
        addressLine2: order.billingAddressLine2,
        city: order.billingCity,
        state: order.billingState,
        pincode: order.billingPincode,
        country: order.billingCountry,
      },
      gstin: order.gstin,
      purchaseOrderNumber: order.purchaseOrderNumber,
      vendorOrganization: order.vendorOrganization,
      lineItems: order.lineItems.map((li) => ({
        id: li.id,
        listingId: li.listingId,
        name: li.snapshotName,
        sku: li.snapshotSku,
        unitPriceInr: li.unitPriceInr.toFixed(2),
        quantity: li.quantity,
        lineTotalInr: li.lineTotalInr.toFixed(2),
      })),
    };
  }
}
