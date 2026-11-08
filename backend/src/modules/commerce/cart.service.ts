import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ListingReviewStatus,
  Prisma,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/commerce.dto';

const cartInclude = {
  partnerOrganization: { select: { id: true, companyName: true } },
  items: {
    include: {
      listing: {
        select: {
          id: true,
          name: true,
          sku: true,
          priceInr: true,
          priceOnRequest: true,
          isPublished: true,
          reviewStatus: true,
          minOrderQuantity: true,
          primaryImageUrl: true,
          organizationId: true,
          hsnCode: true,
          gstPercent: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

export type CartWithRelations = Prisma.CartGetPayload<{
  include: typeof cartInclude;
}>;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const carts = await this.prisma.cart.findMany({
      where: { userId },
      include: cartInclude,
      orderBy: { updatedAt: 'desc' },
    });
    if (carts.length === 0) {
      return {
        sellerCarts: [] as ReturnType<CartService['serializeSellerCart']>[],
        itemCount: 0,
        subtotalInr: '0',
      };
    }
    let totalItems = 0;
    let grandSubtotal = new Prisma.Decimal(0);
    const sellerCarts = carts.map((c) => {
      const ser = this.serializeSellerCart(c);
      totalItems += ser.itemCount;
      grandSubtotal = grandSubtotal.add(new Prisma.Decimal(ser.subtotalInr));
      return ser;
    });
    return {
      sellerCarts,
      itemCount: totalItems,
      subtotalInr: grandSubtotal.toFixed(2),
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const quantity = dto.quantity ?? 1;
    const listing = await this.prisma.partnerListing.findUnique({
      where: { id: dto.listingId },
      include: {
        organization: { select: { verificationStatus: true } },
      },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    this.assertPurchasable(listing);

    let cart = await this.prisma.cart.findUnique({
      where: {
        userId_partnerOrganizationId: {
          userId,
          partnerOrganizationId: listing.organizationId,
        },
      },
      include: { items: true },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
          partnerOrganizationId: listing.organizationId,
          items: {
            create: {
              listingId: listing.id,
              quantity,
            },
          },
        },
        include: { items: true },
      });
    } else {
      const existingItem = cart.items.find((i) => i.listingId === listing.id);
      if (existingItem) {
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: cart.id,
            listingId: listing.id,
            quantity,
          },
        });
      }
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        listing: { select: { minOrderQuantity: true, name: true } },
      },
    });
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }
    const moq = item.listing.minOrderQuantity;
    if (moq != null && moq > 1 && dto.quantity < moq) {
      throw new BadRequestException(
        `Minimum order quantity for "${item.listing.name}" is ${moq}.`,
      );
    }
    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity },
    });
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }
    const cartId = item.cartId;
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    const remaining = await this.prisma.cartItem.count({ where: { cartId } });
    if (remaining === 0) {
      await this.prisma.cart.delete({ where: { id: cartId } });
    }
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    await this.prisma.cart.deleteMany({ where: { userId } });
    return this.getCart(userId);
  }

  /** @param vendorOrganizationId — required when the buyer has more than one non-empty seller cart */
  async getCartForCheckout(userId: string, vendorOrganizationId?: string) {
    const carts = await this.prisma.cart.findMany({
      where: { userId },
      include: cartInclude,
    });
    const nonEmpty = carts.filter((c) => c.items.length > 0);
    if (nonEmpty.length === 0) {
      throw new UnprocessableEntityException('Cart is empty');
    }

    let cart: CartWithRelations;
    if (vendorOrganizationId) {
      const found = nonEmpty.find(
        (c) => c.partnerOrganizationId === vendorOrganizationId,
      );
      if (!found) {
        throw new UnprocessableEntityException(
          'No cart items for that seller. Add items from the marketplace first.',
        );
      }
      cart = found;
    } else if (nonEmpty.length === 1) {
      cart = nonEmpty[0];
    } else {
      throw new UnprocessableEntityException(
        'You have items from multiple sellers. Check out one seller at a time — open checkout from the cart section for that seller.',
      );
    }

    for (const item of cart.items) {
      this.assertPurchasable(item.listing);
      const moq = item.listing.minOrderQuantity;
      if (moq != null && moq > 1 && item.quantity < moq) {
        throw new UnprocessableEntityException(
          `Minimum order quantity for "${item.listing.name}" is ${moq}. Increase quantity in your cart or request a quote via RFQ.`,
        );
      }
    }
    return cart;
  }

  private assertPurchasable(listing: {
    isPublished: boolean;
    reviewStatus?: ListingReviewStatus;
    priceOnRequest: boolean;
    priceInr: Prisma.Decimal | null;
    organization?: { verificationStatus: VerificationStatus };
  }) {
    if (
      !listing.isPublished ||
      (listing.reviewStatus &&
        listing.reviewStatus !== ListingReviewStatus.APPROVED)
    ) {
      throw new UnprocessableEntityException('Listing is not available');
    }
    if (listing.priceOnRequest) {
      throw new UnprocessableEntityException(
        'This listing is price on request — use RFQ instead',
      );
    }
    if (listing.priceInr == null || listing.priceInr.lessThanOrEqualTo(0)) {
      throw new UnprocessableEntityException('Listing has no valid price');
    }
    if (
      listing.organization &&
      listing.organization.verificationStatus !== VerificationStatus.APPROVED
    ) {
      throw new UnprocessableEntityException('Seller is not verified');
    }
  }

  private serializeSellerCart(cart: CartWithRelations) {
    let subtotal = new Prisma.Decimal(0);
    const items = cart.items.map((item) => {
      const unit = item.listing.priceInr ?? new Prisma.Decimal(0);
      const lineTotal = unit.mul(item.quantity);
      subtotal = subtotal.add(lineTotal);
      return {
        id: item.id,
        quantity: item.quantity,
        unitPriceInr: unit.toFixed(2),
        lineTotalInr: lineTotal.toFixed(2),
        listing: {
          id: item.listing.id,
          name: item.listing.name,
          sku: item.listing.sku,
          primaryImageUrl: item.listing.primaryImageUrl,
          minOrderQuantity: item.listing.minOrderQuantity,
          vendorOrganizationId: item.listing.organizationId,
          hsnCode: item.listing.hsnCode,
          gstPercent:
            item.listing.gstPercent != null
              ? item.listing.gstPercent.toFixed(2)
              : null,
        },
      };
    });
    const itemCount = cart.items.reduce((n, i) => n + i.quantity, 0);
    return {
      id: cart.id,
      partnerOrganization: cart.partnerOrganization,
      items,
      itemCount,
      subtotalInr: subtotal.toFixed(2),
    };
  }
}
