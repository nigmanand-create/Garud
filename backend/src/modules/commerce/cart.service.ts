import {
  ConflictException,
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
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });
    if (!cart) {
      return {
        id: null,
        partnerOrganization: null,
        items: [],
        itemCount: 0,
        subtotalInr: '0',
      };
    }
    return this.serializeCart(cart);
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

    const existingCart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (existingCart) {
      if (existingCart.partnerOrganizationId !== listing.organizationId) {
        throw new ConflictException(
          'Your cart contains items from another seller. Clear the cart or complete checkout before adding items from this seller.',
        );
      }
      const existingItem = existingCart.items.find(
        (i) => i.listingId === listing.id,
      );
      if (existingItem) {
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: existingCart.id,
            listingId: listing.id,
            quantity,
          },
        });
      }
    } else {
      await this.prisma.cart.create({
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
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.findOwnedCartItem(userId, itemId);
    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity },
    });
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    await this.findOwnedCartItem(userId, itemId);
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { userId },
      include: { items: true },
    });
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    if (cart.items.length === 1) {
      await this.prisma.cart.delete({ where: { id: cart.id } });
      return this.getCart(userId);
    }
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cart.delete({ where: { id: cart.id } });
    }
    return this.getCart(userId);
  }

  async getCartForCheckout(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });
    if (!cart || cart.items.length === 0) {
      throw new UnprocessableEntityException('Cart is empty');
    }
    for (const item of cart.items) {
      this.assertPurchasable(item.listing);
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

  private async findOwnedCartItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }
    return item;
  }

  private serializeCart(
    cart: Prisma.CartGetPayload<{ include: typeof cartInclude }>,
  ) {
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
