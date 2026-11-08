import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreateBuyerAddressDto,
  UpdateBuyerAddressDto,
} from './dto/buyer-address.dto';
import { CheckoutAddressDto } from './dto/commerce.dto';

@Injectable()
export class BuyerAddressService {
  constructor(private readonly prisma: PrismaService) {}

  private assertBuyer(role: UserRole) {
    if (role !== UserRole.BUYER && role !== UserRole.GOVERNMENT) {
      throw new ForbiddenException('Only buyers can manage addresses');
    }
  }

  async getBuyerOrgId(buyerUserId: string, role: UserRole): Promise<string> {
    this.assertBuyer(role);
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: buyerUserId },
      select: { id: true },
    });
    if (!org) {
      throw new NotFoundException('Buyer organization not found');
    }
    return org.id;
  }

  private serialize(row: {
    id: string;
    label: string;
    companyName: string | null;
    contactName: string;
    contactPhone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      label: row.label,
      companyName: row.companyName ?? '',
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      line1: row.line1,
      line2: row.line2 ?? '',
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      country: row.country,
      isDefault: row.isDefault,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(buyerUserId: string, role: UserRole) {
    const orgId = await this.getBuyerOrgId(buyerUserId, role);
    const rows = await this.prisma.buyerAddress.findMany({
      where: { buyerOrganizationId: orgId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return { addresses: rows.map((r) => this.serialize(r)) };
  }

  async create(
    buyerUserId: string,
    role: UserRole,
    dto: CreateBuyerAddressDto,
  ) {
    const orgId = await this.getBuyerOrgId(buyerUserId, role);

    const created = await this.prisma.$transaction(async (tx) => {
      const count = await tx.buyerAddress.count({
        where: { buyerOrganizationId: orgId },
      });
      const isFirst = count === 0;
      /** First saved row is always default; later rows only when requested. */
      const isDefault = isFirst || dto.isDefault === true;

      if (isDefault) {
        await tx.buyerAddress.updateMany({
          where: { buyerOrganizationId: orgId },
          data: { isDefault: false },
        });
      }

      return tx.buyerAddress.create({
        data: {
          buyerOrganizationId: orgId,
          label: dto.label.trim(),
          companyName: dto.companyName?.trim() || null,
          contactName: dto.contactName.trim(),
          contactPhone: dto.contactPhone.trim(),
          line1: dto.line1.trim(),
          line2: dto.line2?.trim() || null,
          city: dto.city.trim(),
          state: dto.state.trim(),
          pincode: dto.pincode.trim(),
          country: (dto.country || 'India').trim(),
          isDefault,
        },
      });
    });

    return this.serialize(created);
  }

  /** Used from checkout — creates address from shipping payload; optional label. */
  async createFromCheckoutShipping(
    buyerOrganizationId: string,
    shipping: CheckoutAddressDto,
    options?: { label?: string; setAsDefault?: boolean },
  ) {
    const trimmedLabel = (options?.label || 'Saved address')
      .trim()
      .slice(0, 80);

    const created = await this.prisma.$transaction(async (tx) => {
      const count = await tx.buyerAddress.count({
        where: { buyerOrganizationId },
      });
      const isFirst = count === 0;
      const makeDefault =
        options?.setAsDefault === true || (!options?.setAsDefault && isFirst);

      if (makeDefault) {
        await tx.buyerAddress.updateMany({
          where: { buyerOrganizationId },
          data: { isDefault: false },
        });
      }

      return tx.buyerAddress.create({
        data: {
          buyerOrganizationId,
          label: trimmedLabel,
          companyName: shipping.companyName?.trim() || null,
          contactName: shipping.contactName.trim(),
          contactPhone: shipping.contactPhone.trim(),
          line1: shipping.addressLine1.trim(),
          line2: shipping.addressLine2?.trim() || null,
          city: shipping.city.trim(),
          state: shipping.state.trim(),
          pincode: shipping.pincode.trim(),
          country: (shipping.country || 'India').trim(),
          isDefault: makeDefault,
        },
      });
    });

    return this.serialize(created);
  }

  async update(
    buyerUserId: string,
    role: UserRole,
    id: string,
    dto: UpdateBuyerAddressDto,
  ) {
    const orgId = await this.getBuyerOrgId(buyerUserId, role);
    const existing = await this.prisma.buyerAddress.findFirst({
      where: { id, buyerOrganizationId: orgId },
    });
    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.buyerAddress.updateMany({
          where: { buyerOrganizationId: orgId, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.buyerAddress.update({
        where: { id },
        data: {
          ...(dto.label != null ? { label: dto.label.trim() } : {}),
          ...(dto.companyName !== undefined
            ? { companyName: dto.companyName.trim() || null }
            : {}),
          ...(dto.contactName != null
            ? { contactName: dto.contactName.trim() }
            : {}),
          ...(dto.contactPhone != null
            ? { contactPhone: dto.contactPhone.trim() }
            : {}),
          ...(dto.line1 != null ? { line1: dto.line1.trim() } : {}),
          ...(dto.line2 !== undefined
            ? { line2: dto.line2?.trim() || null }
            : {}),
          ...(dto.city != null ? { city: dto.city.trim() } : {}),
          ...(dto.state != null ? { state: dto.state.trim() } : {}),
          ...(dto.pincode != null ? { pincode: dto.pincode.trim() } : {}),
          ...(dto.country != null ? { country: dto.country.trim() } : {}),
          ...(dto.isDefault != null ? { isDefault: dto.isDefault } : {}),
        },
      });
    });

    return this.serialize(updated);
  }

  async remove(buyerUserId: string, role: UserRole, id: string) {
    const orgId = await this.getBuyerOrgId(buyerUserId, role);
    const existing = await this.prisma.buyerAddress.findFirst({
      where: { id, buyerOrganizationId: orgId },
    });
    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.buyerAddress.delete({ where: { id } });
      if (existing.isDefault) {
        const next = await tx.buyerAddress.findFirst({
          where: { buyerOrganizationId: orgId },
          orderBy: { updatedAt: 'desc' },
        });
        if (next) {
          await tx.buyerAddress.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { ok: true as const };
  }

  async setDefault(buyerUserId: string, role: UserRole, id: string) {
    const orgId = await this.getBuyerOrgId(buyerUserId, role);
    const existing = await this.prisma.buyerAddress.findFirst({
      where: { id, buyerOrganizationId: orgId },
    });
    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.buyerAddress.updateMany({
        where: { buyerOrganizationId: orgId },
        data: { isDefault: false },
      });
      await tx.buyerAddress.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    const row = await this.prisma.buyerAddress.findUniqueOrThrow({
      where: { id },
    });
    return this.serialize(row);
  }

  /** Resolve a saved row to checkout shipping DTO (buyer org scoped). */
  async resolveToCheckoutShipping(
    buyerOrganizationId: string,
    addressId: string,
  ): Promise<CheckoutAddressDto> {
    const row = await this.prisma.buyerAddress.findFirst({
      where: { id: addressId, buyerOrganizationId },
    });
    if (!row) {
      throw new NotFoundException('Saved address not found');
    }
    return {
      companyName: row.companyName ?? '',
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      addressLine1: row.line1,
      addressLine2: row.line2 ?? undefined,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      country: row.country,
    };
  }
}
