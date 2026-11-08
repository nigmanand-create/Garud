import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountType,
  AdminUserAuditAction,
  Prisma,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { roleForAccountType } from '../identity/account-type.util';
import { AuthService } from '../identity/auth.service';
import { CreateAdminUserDto, UpdateUserRoleDto } from './dto/admin-users.dto';

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  accountType: true,
  mustChangePassword: true,
  disabledAt: true,
  deletedAt: true,
  createdAt: true,
  organization: {
    select: { id: true, companyName: true, verificationStatus: true },
  },
} satisfies Prisma.UserSelect;

/**
 * Admin user / role management.
 * All endpoints are PLATFORM_ADMIN-only (controller guard). Guard rails here:
 *  - no self role-change / self-disable / self password reset
 *  - the last active admin can never be demoted or disabled
 *  - demotion only for users that own an organization (console-created admins have none)
 *  - temporary passwords are returned once, flagged `mustChangePassword`, sessions revoked
 */
@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    role?: UserRole;
    search?: string;
    status?: 'active' | 'disabled';
    skip?: number;
    take?: number;
  }) {
    const take = Math.min(Math.max(params.take ?? 25, 1), 100);
    const skip = Math.max(params.skip ?? 0, 0);
    const search = params.search?.trim();
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(params.role ? { role: params.role } : {}),
      ...(params.status === 'disabled'
        ? { disabledAt: { not: null } }
        : params.status === 'active'
          ? { disabledAt: null }
          : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              {
                organization: {
                  companyName: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total, groups, activeAdmins] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.countActiveAdmins(),
    ]);

    const roleCounts = Object.fromEntries(
      Object.values(UserRole).map((r) => [r, 0]),
    ) as Record<UserRole, number>;
    for (const g of groups) roleCounts[g.role] = g._count._all;

    return { items, total, skip, take, roleCounts, activeAdmins };
  }

  async createAdmin(actorUserId: string, dto: CreateAdminUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('Email already registered');
    }
    const temporaryPassword = AuthService.generateRandomPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      if (existing?.deletedAt) {
        await tx.user.update({
          where: { id: existing.id },
          data: { email: `deleted_${existing.id}@removed.garudhub.invalid` },
        });
      }
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.PLATFORM_ADMIN,
          accountType: AccountType.TECHNOLOGY_COMPANY,
          mustChangePassword: true,
        },
        select: USER_SELECT,
      });
      await this.log(tx, {
        actorUserId,
        target: created,
        action: AdminUserAuditAction.USER_CREATED,
        detail: 'Created platform admin',
      });
      return created;
    });

    return { user, temporaryPassword };
  }

  async updateRole(actorUserId: string, id: string, dto: UpdateUserRoleDto) {
    const target = await this.requireActiveUser(id);
    if (target.id === actorUserId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const isAdmin = target.role === UserRole.PLATFORM_ADMIN;
    let accountType = target.accountType;

    if (dto.role === UserRole.PLATFORM_ADMIN) {
      if (isAdmin) {
        throw new BadRequestException('User is already a platform admin');
      }
    } else {
      // Demotion: only platform admins can be moved back to a customer role, and
      // the role must stay consistent with the account type (see roleForAccountType).
      if (!isAdmin) {
        throw new BadRequestException(
          'Only platform admins can be demoted; partner/buyer accounts are managed through registration and KYC',
        );
      }
      if (!target.organization) {
        throw new BadRequestException(
          'This admin has no organization, so it cannot be converted to a partner/buyer. Create a new account via registration instead.',
        );
      }
      await this.assertNotLastActiveAdmin(target.id);
      accountType = dto.accountType ?? target.accountType;
      if (roleForAccountType(accountType) !== dto.role) {
        throw new BadRequestException(
          `Account type ${accountType} does not match role ${dto.role}; choose a matching accountType`,
        );
      }
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: target.id },
        data: { role: dto.role, accountType },
        select: USER_SELECT,
      });
      // Tokens carry role claims; force a fresh login after privilege changes.
      await tx.refreshToken.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.log(tx, {
        actorUserId,
        target: updated,
        action: AdminUserAuditAction.ROLE_CHANGED,
        detail: `${target.role} → ${dto.role}${
          accountType !== target.accountType
            ? ` (account type ${target.accountType} → ${accountType})`
            : ''
        }`,
      });
      return updated;
    });
    return { user };
  }

  async resetPassword(actorUserId: string, id: string) {
    const target = await this.requireActiveUser(id);
    if (target.id === actorUserId) {
      throw new ForbiddenException(
        'Use change password to update your own password',
      );
    }
    const temporaryPassword = AuthService.generateRandomPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: target.id },
        data: { passwordHash, mustChangePassword: true },
        select: USER_SELECT,
      });
      await tx.refreshToken.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.log(tx, {
        actorUserId,
        target: updated,
        action: AdminUserAuditAction.PASSWORD_RESET,
        detail: 'Temporary password issued; sessions revoked',
      });
      return updated;
    });
    return { user, temporaryPassword };
  }

  async setDisabled(actorUserId: string, id: string, disabled: boolean) {
    const target = await this.requireActiveUser(id);
    if (target.id === actorUserId) {
      throw new ForbiddenException('You cannot disable your own account');
    }
    if (disabled === Boolean(target.disabledAt)) {
      throw new BadRequestException(
        disabled ? 'User is already disabled' : 'User is not disabled',
      );
    }
    if (disabled && target.role === UserRole.PLATFORM_ADMIN) {
      await this.assertNotLastActiveAdmin(target.id);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: target.id },
        data: { disabledAt: disabled ? new Date() : null },
        select: USER_SELECT,
      });
      if (disabled) {
        await tx.refreshToken.updateMany({
          where: { userId: target.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await this.log(tx, {
        actorUserId,
        target: updated,
        action: disabled
          ? AdminUserAuditAction.USER_DISABLED
          : AdminUserAuditAction.USER_ENABLED,
        detail: disabled ? 'Account disabled' : 'Account re-enabled',
      });
      return updated;
    });
    return { user };
  }

  /**
   * Soft-delete: anonymize PII, revoke sessions, exclude from admin user list.
   * Keeps the row and FK history (orders, org owner, etc.). Does not remove last active admin.
   */
  async deleteUser(actorUserId: string, id: string) {
    const target = await this.requireActiveUser(id);
    if (target.id === actorUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    if (target.role === UserRole.PLATFORM_ADMIN) {
      await this.assertNotLastActiveAdmin(target.id);
    }

    const originalEmail = target.email;
    const anonymizedEmail = `deleted_${target.id}@removed.garudhub.invalid`;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: target.id },
        data: {
          deletedAt: new Date(),
          email: anonymizedEmail,
          passwordHash: null,
          googleSub: null,
          phoneE164: null,
          phoneVerifiedAt: null,
          mustChangePassword: false,
          disabledAt: null,
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.log(tx, {
        actorUserId,
        target: { id: target.id, email: originalEmail },
        action: AdminUserAuditAction.USER_DELETED,
        detail:
          'Account soft-deleted (credentials cleared, user removed from admin directory)',
      });
    });

    return { ok: true as const };
  }

  private countActiveAdmins() {
    return this.prisma.user.count({
      where: {
        role: UserRole.PLATFORM_ADMIN,
        disabledAt: null,
        deletedAt: null,
      },
    });
  }

  /** Target must not be the only remaining active admin. */
  private async assertNotLastActiveAdmin(targetId: string) {
    const others = await this.prisma.user.count({
      where: {
        role: UserRole.PLATFORM_ADMIN,
        disabledAt: null,
        deletedAt: null,
        id: { not: targetId },
      },
    });
    if (others < 1) {
      throw new ForbiddenException(
        'Cannot remove the last active platform admin',
      );
    }
  }

  private async requireActiveUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private log(
    tx: Prisma.TransactionClient,
    args: {
      actorUserId: string;
      target: { id: string; email: string };
      action: AdminUserAuditAction;
      detail?: string;
    },
  ) {
    return tx.adminUserAuditLog.create({
      data: {
        actorUserId: args.actorUserId,
        targetUserId: args.target.id,
        targetEmail: args.target.email,
        action: args.action,
        detail: args.detail,
      },
    });
  }
}
