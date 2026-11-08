import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentGateway,
  PaymentStatus,
  PaymentTransaction,
  Prisma,
  TransactionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { BuyerAddressService } from './buyer-address.service';
import { CartService } from './cart.service';
import {
  CheckoutAddressDto,
  CheckoutPaymentMethod,
  PlaceCheckoutDto,
} from './dto/commerce.dto';

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    vendorOrganization: { select: { id: true; companyName: true } };
    lineItems: {
      include: {
        listing: {
          select: {
            id: true;
            name: true;
            sku: true;
            primaryImageUrl: true;
          };
        };
      };
    };
  };
}> & {
  transactions?: PaymentTransaction[];
};

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly configService: ConfigService,
    private readonly buyerAddressService: BuyerAddressService,
  ) {}

  private isCodEnabled(): boolean {
    const v =
      this.configService.get<string>('COD_ENABLED') ??
      process.env.COD_ENABLED ??
      '';
    return v.trim().toLowerCase() === 'true';
  }

  private normalizeState(state: string | null | undefined): string | null {
    const s = state?.trim();
    return s ? s.toLowerCase() : null;
  }

  getCheckoutFlags() {
    return { codEnabled: this.isCodEnabled() };
  }

  async placeOrder(
    buyerUserId: string,
    buyerRole: UserRole,
    dto: PlaceCheckoutDto,
  ) {
    if (buyerRole !== UserRole.BUYER && buyerRole !== UserRole.GOVERNMENT) {
      throw new UnprocessableEntityException('Only buyers can place orders');
    }

    const paymentMethod = dto.paymentMethod ?? CheckoutPaymentMethod.ONLINE;

    if (
      paymentMethod === CheckoutPaymentMethod.CASH_ON_DELIVERY &&
      !this.isCodEnabled()
    ) {
      throw new UnprocessableEntityException(
        'Cash on Delivery is not enabled for this deployment',
      );
    }

    const org = await this.prisma.organization.findUnique({
      where: { ownerId: buyerUserId },
    });
    if (!org) {
      throw new NotFoundException('Buyer organization not found');
    }

    let shippingAddr: CheckoutAddressDto;
    if (dto.buyerAddressId) {
      shippingAddr = await this.buyerAddressService.resolveToCheckoutShipping(
        org.id,
        dto.buyerAddressId,
      );
    } else if (dto.shipping) {
      shippingAddr = dto.shipping;
    } else {
      throw new UnprocessableEntityException(
        'Provide shipping or buyerAddressId',
      );
    }

    const cart = await this.cartService.getCartForCheckout(
      buyerUserId,
      dto.vendorOrganizationId,
    );
    const placeDto: PlaceCheckoutDto = { ...dto, shipping: shippingAddr };
    const billing = this.resolveBilling(placeDto);

    const vendorOrg = await this.prisma.organization.findUnique({
      where: { id: cart.partnerOrganizationId },
      select: { state: true },
    });

    const buyerStateForTax = this.normalizeState(billing.state);
    const vendorStateForTax = this.normalizeState(vendorOrg?.state);
    const intraState =
      buyerStateForTax != null &&
      vendorStateForTax != null &&
      buyerStateForTax === vendorStateForTax;
    /** If we cannot compare states, assume inter-state (IGST-only) to avoid wrong CGST/SGST. */
    const useIntraStateSplit = intraState;

    let taxableSubtotalSum = new Prisma.Decimal(0);
    let taxSum = new Prisma.Decimal(0);
    let grossSum = new Prisma.Decimal(0);
    const lineData: Prisma.OrderLineItemCreateWithoutOrderInput[] = [];
    const hundred = new Prisma.Decimal(100);

    for (const item of cart.items) {
      const unit = item.listing.priceInr ?? new Prisma.Decimal(0);
      const lineGross = unit.mul(item.quantity);
      const rate = item.listing.gstPercent;
      const hasGst = rate != null && rate.gt(0);

      let snapshotGstPercent: Prisma.Decimal | null = null;
      let taxableValueInr: Prisma.Decimal;
      let cgstInr: Prisma.Decimal;
      let sgstInr: Prisma.Decimal;
      let igstInr: Prisma.Decimal;

      if (!hasGst) {
        taxableValueInr = lineGross;
        cgstInr = new Prisma.Decimal(0);
        sgstInr = new Prisma.Decimal(0);
        igstInr = new Prisma.Decimal(0);
      } else {
        snapshotGstPercent = rate;
        const divisor = hundred.add(rate);
        taxableValueInr = lineGross.mul(hundred).div(divisor);
        const taxTotalLine = new Prisma.Decimal(
          lineGross.sub(taxableValueInr).toFixed(2),
        );
        if (useIntraStateSplit) {
          const half = new Prisma.Decimal(taxTotalLine.div(2).toFixed(2));
          cgstInr = half;
          sgstInr = new Prisma.Decimal(taxTotalLine.sub(half).toFixed(2));
          igstInr = new Prisma.Decimal(0);
        } else {
          cgstInr = new Prisma.Decimal(0);
          sgstInr = new Prisma.Decimal(0);
          igstInr = taxTotalLine;
        }
      }

      grossSum = grossSum.add(lineGross);
      taxableSubtotalSum = taxableSubtotalSum.add(taxableValueInr);
      taxSum = taxSum.add(cgstInr.add(sgstInr).add(igstInr));

      lineData.push({
        listing: { connect: { id: item.listing.id } },
        snapshotName: item.listing.name,
        snapshotSku: item.listing.sku,
        snapshotImageUrl: item.listing.primaryImageUrl ?? null,
        snapshotHsnCode: item.listing.hsnCode ?? null,
        snapshotGstPercent,
        taxableValueInr,
        cgstInr,
        sgstInr,
        igstInr,
        unitPriceInr: unit,
        quantity: item.quantity,
        lineTotalInr: lineGross,
      });
    }

    const shippingFee = new Prisma.Decimal(0);
    const total = grossSum.add(shippingFee);

    const buyerGstin = org.gst?.trim() || null;

    const shippingPayloadForBook = dto.shipping;

    const orderCompanyName =
      (shippingAddr.companyName?.trim() || org.companyName).trim();

    const orderId = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          buyerUserId,
          buyerOrganizationId: org.id,
          vendorOrganizationId: cart.partnerOrganizationId,
          subtotalInr: taxableSubtotalSum,
          taxInr: taxSum,
          shippingInr: shippingFee,
          totalInr: total,
          companyName: orderCompanyName,
          contactName: shippingAddr.contactName,
          contactPhone: shippingAddr.contactPhone,
          shippingAddressLine1: shippingAddr.addressLine1,
          shippingAddressLine2: shippingAddr.addressLine2,
          shippingCity: shippingAddr.city,
          shippingState: shippingAddr.state,
          shippingPincode: shippingAddr.pincode,
          shippingCountry: shippingAddr.country,
          billingAddressLine1: billing.addressLine1,
          billingAddressLine2: billing.addressLine2,
          billingCity: billing.city,
          billingState: billing.state,
          billingPincode: billing.pincode,
          billingCountry: billing.country,
          gstin: buyerGstin,
          purchaseOrderNumber: dto.purchaseOrderNumber,
          lineItems: { create: lineData },
        },
      });

      if (paymentMethod === CheckoutPaymentMethod.CASH_ON_DELIVERY) {
        await tx.paymentTransaction.create({
          data: {
            orderId: created.id,
            gateway: PaymentGateway.CASH_ON_DELIVERY,
            amountInr: total,
            currency: 'INR',
            status: TransactionStatus.PROCESSING,
            paymentMethod: 'cash_on_delivery',
            metadata: { placedVia: 'buyer_checkout' },
          },
        });
      }

      await tx.cart.delete({ where: { id: cart.id } });
      return created.id;
    });

    if (
      dto.saveNewAddressToBook &&
      shippingPayloadForBook &&
      !dto.buyerAddressId
    ) {
      try {
        await this.buyerAddressService.createFromCheckoutShipping(
          org.id,
          shippingPayloadForBook,
          {
            label: dto.saveAddressLabel,
            setAsDefault: dto.saveAddressAsDefault === true,
          },
        );
      } catch {
        // Best-effort after successful order
      }
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      include: {
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
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found after placement');
    }
    return this.serializeOrder(order);
  }

  private resolveBilling(dto: PlaceCheckoutDto): CheckoutAddressDto {
    const ship = dto.shipping;
    if (!ship) {
      throw new UnprocessableEntityException('Shipping address required');
    }
    if (dto.billingSameAsShipping !== false && !dto.billing) {
      return ship;
    }
    if (dto.billing) {
      return dto.billing;
    }
    return ship;
  }

  async getSavedAddress(buyerUserId: string, selectedBuyerAddressId?: string) {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: buyerUserId },
    });

    if (org && selectedBuyerAddressId) {
      const picked = await this.prisma.buyerAddress.findFirst({
        where: { id: selectedBuyerAddressId, buyerOrganizationId: org.id },
      });
      if (picked) {
        return {
          hasSavedAddress: true,
          source: 'address_book' as const,
          selectedBuyerAddressId: picked.id,
          address: {
            companyName: picked.companyName ?? '',
            contactName: picked.contactName,
            contactPhone: picked.contactPhone,
            addressLine1: picked.line1,
            addressLine2: picked.line2 || '',
            city: picked.city,
            state: picked.state,
            pincode: picked.pincode,
            country: picked.country,
            billingAddressLine1: picked.line1,
            billingAddressLine2: picked.line2 || '',
            billingCity: picked.city,
            billingState: picked.state,
            billingPincode: picked.pincode,
            billingCountry: picked.country,
            billingSameAsShipping: true,
            purchaseOrderNumber: '',
          },
        };
      }
    }

    if (org) {
      const defaultBook = await this.prisma.buyerAddress.findFirst({
        where: { buyerOrganizationId: org.id, isDefault: true },
        orderBy: { updatedAt: 'desc' },
      });
      const anyBook =
        defaultBook ??
        (await this.prisma.buyerAddress.findFirst({
          where: { buyerOrganizationId: org.id },
          orderBy: { updatedAt: 'desc' },
        }));
      if (anyBook) {
        return {
          hasSavedAddress: true,
          source: 'address_book' as const,
          selectedBuyerAddressId: anyBook.id,
          address: {
            companyName: anyBook.companyName ?? '',
            contactName: anyBook.contactName,
            contactPhone: anyBook.contactPhone,
            addressLine1: anyBook.line1,
            addressLine2: anyBook.line2 || '',
            city: anyBook.city,
            state: anyBook.state,
            pincode: anyBook.pincode,
            country: anyBook.country,
            billingAddressLine1: anyBook.line1,
            billingAddressLine2: anyBook.line2 || '',
            billingCity: anyBook.city,
            billingState: anyBook.state,
            billingPincode: anyBook.pincode,
            billingCountry: anyBook.country,
            billingSameAsShipping: true,
            purchaseOrderNumber: '',
          },
        };
      }
    }

    const lastOrder = await this.prisma.order.findFirst({
      where: { buyerUserId },
      orderBy: { placedAt: 'desc' },
    });

    if (lastOrder) {
      const isSame =
        lastOrder.shippingAddressLine1 === lastOrder.billingAddressLine1 &&
        lastOrder.shippingPincode === lastOrder.billingPincode;

      return {
        hasSavedAddress: true,
        source: 'last_order' as const,
        selectedBuyerAddressId: null,
        address: {
          companyName: lastOrder.companyName,
          contactName: lastOrder.contactName,
          contactPhone: lastOrder.contactPhone,
          addressLine1: lastOrder.shippingAddressLine1,
          addressLine2: lastOrder.shippingAddressLine2 || '',
          city: lastOrder.shippingCity,
          state: lastOrder.shippingState,
          pincode: lastOrder.shippingPincode,
          country: lastOrder.shippingCountry,
          billingAddressLine1: lastOrder.billingAddressLine1,
          billingAddressLine2: lastOrder.billingAddressLine2 || '',
          billingCity: lastOrder.billingCity,
          billingState: lastOrder.billingState,
          billingPincode: lastOrder.billingPincode,
          billingCountry: lastOrder.billingCountry,
          billingSameAsShipping: isSame,
          purchaseOrderNumber: lastOrder.purchaseOrderNumber || '',
        },
      };
    }

    if (org) {
      return {
        hasSavedAddress: false,
        source: 'organization' as const,
        selectedBuyerAddressId: null,
        address: {
          companyName: org.companyName,
          contactName: org.contactPersonName || '',
          contactPhone: org.contactMobile || '',
          addressLine1: '',
          addressLine2: '',
          city: org.city || '',
          state: org.state || '',
          pincode: '',
          country: org.country || 'India',
          billingAddressLine1: '',
          billingAddressLine2: '',
          billingCity: org.city || '',
          billingState: org.state || '',
          billingPincode: '',
          billingCountry: org.country || 'India',
          billingSameAsShipping: true,
          purchaseOrderNumber: '',
        },
      };
    }

    return {
      hasSavedAddress: false,
      source: null,
      selectedBuyerAddressId: null,
      address: null,
    };
  }

  serializeOrder(order: OrderWithRelations) {
    const lineItems = order.lineItems ?? [];
    return {
      id: order.id,
      rfqId: order.rfqId ?? null,
      quotationId: order.quotationId ?? null,
      status: order.status,
      fulfillmentStatus: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      placedAt: order.placedAt.toISOString(),
      subtotalInr: order.subtotalInr.toFixed(2),
      taxInr: order.taxInr.toFixed(2),
      shippingInr: order.shippingInr.toFixed(2),
      totalInr: order.totalInr.toFixed(2),
      carrierName: order.carrierName ?? null,
      trackingNumber: order.trackingNumber ?? null,
      trackingUrl: order.trackingUrl ?? null,
      dispatchedAt: order.dispatchedAt
        ? order.dispatchedAt.toISOString()
        : null,
      deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
      estimatedDeliveryAt: order.estimatedDeliveryAt
        ? order.estimatedDeliveryAt.toISOString()
        : null,
      hardwareSerialNumbers: order.hardwareSerialNumbers || [],
      fulfillmentNotes: order.fulfillmentNotes ?? null,
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
      codPaymentPending:
        order.paymentStatus === PaymentStatus.PENDING &&
        (order.transactions?.some(
          (t) => t.gateway === PaymentGateway.CASH_ON_DELIVERY,
        ) ??
          false),
      transactions: order.transactions
        ? order.transactions.map((t) => ({
            id: t.id,
            gateway: t.gateway,
            gatewayOrderId: t.gatewayOrderId,
            gatewayPaymentId: t.gatewayPaymentId,
            utrNumber: t.utrNumber,
            senderBankName: t.senderBankName,
            amountInr: t.amountInr.toFixed(2),
            currency: t.currency,
            status: t.status,
            paymentMethod: t.paymentMethod,
            failureReason: t.failureReason,
            metadata: t.metadata,
            createdAt: t.createdAt.toISOString(),
          }))
        : [],
      lineItems: lineItems.map((li) => ({
        id: li.id,
        listingId: li.listingId,
        name: li.snapshotName,
        sku: li.snapshotSku,
        imageUrl: li.snapshotImageUrl || li.listing?.primaryImageUrl || null,
        unitPriceInr: li.unitPriceInr.toFixed(2),
        quantity: li.quantity,
        lineTotalInr: li.lineTotalInr.toFixed(2),
        hsnCode: li.snapshotHsnCode ?? null,
        gstPercent:
          li.snapshotGstPercent != null
            ? li.snapshotGstPercent.toFixed(2)
            : null,
        taxableValueInr: li.taxableValueInr?.toFixed(2) ?? null,
        cgstInr: li.cgstInr?.toFixed(2) ?? '0.00',
        sgstInr: li.sgstInr?.toFixed(2) ?? '0.00',
        igstInr: li.igstInr?.toFixed(2) ?? '0.00',
      })),
    };
  }
}
