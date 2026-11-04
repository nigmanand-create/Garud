import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AccountType,
  AdminUserAuditAction,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    refreshToken: { updateMany: jest.fn() },
    adminUserAuditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin = (over: Record<string, unknown> = {}) => ({
    id: 'admin-2',
    email: 'ops@garudhub.in',
    role: UserRole.PLATFORM_ADMIN,
    accountType: AccountType.TECHNOLOGY_COMPANY,
    mustChangePassword: false,
    disabledAt: null,
    createdAt: new Date(),
    organization: null,
    ...over,
  });
  const partner = (over: Record<string, unknown> = {}) => ({
    id: 'user-1',
    email: 'partner@x.com',
    role: UserRole.PARTNER,
    accountType: AccountType.MANUFACTURER,
    mustChangePassword: false,
    disabledAt: null,
    createdAt: new Date(),
    organization: {
      id: 'org-1',
      companyName: 'X',
      verificationStatus: VerificationStatus.APPROVED,
    },
    ...over,
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock),
    );
    prismaMock.user.update.mockImplementation(
      ({ where, data }: { where: { id: string }; data: object }) =>
        Promise.resolve({ ...partner({ id: where.id }), ...data }),
    );
    const module = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(AdminUsersService);
  });

  describe('createAdmin', () => {
    it('creates an admin with a hashed temporary password and audit entry', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockImplementation(
        ({ data }: { data: { email: string } }) =>
          Promise.resolve(admin({ email: data.email, id: 'new-admin' })),
      );

      const res = await service.createAdmin('admin-1', {
        email: 'New@Garudhub.in',
      });

      const data = prismaMock.user.create.mock.calls[0][0].data;
      expect(data.email).toBe('new@garudhub.in');
      expect(data.role).toBe(UserRole.PLATFORM_ADMIN);
      expect(data.mustChangePassword).toBe(true);
      expect(data.passwordHash).not.toBe(res.temporaryPassword);
      await expect(
        bcrypt.compare(res.temporaryPassword, data.passwordHash),
      ).resolves.toBe(true);
      expect(prismaMock.adminUserAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorUserId: 'admin-1',
          targetUserId: 'new-admin',
          action: AdminUserAuditAction.USER_CREATED,
        }),
      });
    });

    it('rejects an email that is already registered', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u' });
      await expect(
        service.createAdmin('admin-1', { email: 'a@b.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    it('promotes a user to admin, revokes sessions and logs the change', async () => {
      prismaMock.user.findUnique.mockResolvedValue(partner());
      await service.updateRole('admin-1', 'user-1', {
        role: UserRole.PLATFORM_ADMIN,
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            role: UserRole.PLATFORM_ADMIN,
            accountType: AccountType.MANUFACTURER,
          },
        }),
      );
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
      expect(prismaMock.adminUserAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AdminUserAuditAction.ROLE_CHANGED,
          detail: 'PARTNER → PLATFORM_ADMIN',
        }),
      });
    });

    it('blocks changing your own role', async () => {
      prismaMock.user.findUnique.mockResolvedValue(admin({ id: 'admin-1' }));
      await expect(
        service.updateRole('admin-1', 'admin-1', { role: UserRole.PARTNER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects promoting someone who is already admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue(admin());
      await expect(
        service.updateRole('admin-1', 'admin-2', {
          role: UserRole.PLATFORM_ADMIN,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('only allows demoting platform admins', async () => {
      prismaMock.user.findUnique.mockResolvedValue(partner());
      await expect(
        service.updateRole('admin-1', 'user-1', { role: UserRole.BUYER }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses to demote a console-created admin without an organization', async () => {
      prismaMock.user.findUnique.mockResolvedValue(admin());
      await expect(
        service.updateRole('admin-1', 'admin-2', { role: UserRole.PARTNER }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses to demote the last active admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue(
        admin({ organization: { id: 'o', companyName: 'GarudHub' } }),
      );
      prismaMock.user.count.mockResolvedValue(0);
      await expect(
        service.updateRole('admin-1', 'admin-2', { role: UserRole.PARTNER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('requires role to match the account type when demoting', async () => {
      prismaMock.user.findUnique.mockResolvedValue(
        admin({ organization: { id: 'o', companyName: 'GarudHub' } }),
      );
      prismaMock.user.count.mockResolvedValue(1);
      await expect(
        service.updateRole('admin-1', 'admin-2', { role: UserRole.BUYER }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await service.updateRole('admin-1', 'admin-2', {
        role: UserRole.BUYER,
        accountType: AccountType.BUYER_ENTERPRISE,
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            role: UserRole.BUYER,
            accountType: AccountType.BUYER_ENTERPRISE,
          },
        }),
      );
    });

    it('404s for an unknown user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updateRole('admin-1', 'nope', {
          role: UserRole.PLATFORM_ADMIN,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('resetPassword', () => {
    it('issues a temporary password, forces change and revokes sessions', async () => {
      prismaMock.user.findUnique.mockResolvedValue(partner());
      const res = await service.resetPassword('admin-1', 'user-1');
      expect(res.temporaryPassword.length).toBeGreaterThanOrEqual(16);
      const data = prismaMock.user.update.mock.calls[0][0].data;
      expect(data.mustChangePassword).toBe(true);
      expect(data.passwordHash).not.toBe(res.temporaryPassword);
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
      expect(prismaMock.adminUserAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AdminUserAuditAction.PASSWORD_RESET,
        }),
      });
    });

    it('blocks resetting your own password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(admin({ id: 'admin-1' }));
      await expect(
        service.resetPassword('admin-1', 'admin-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('setDisabled', () => {
    it('disables a user and revokes sessions', async () => {
      prismaMock.user.findUnique.mockResolvedValue(partner());
      await service.setDisabled('admin-1', 'user-1', true);
      expect(prismaMock.user.update.mock.calls[0][0].data.disabledAt).toEqual(
        expect.any(Date),
      );
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
      expect(prismaMock.adminUserAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AdminUserAuditAction.USER_DISABLED,
        }),
      });
    });

    it('re-enables a disabled user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(
        partner({ disabledAt: new Date() }),
      );
      await service.setDisabled('admin-1', 'user-1', false);
      expect(
        prismaMock.user.update.mock.calls[0][0].data.disabledAt,
      ).toBeNull();
      expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('blocks self-disable and last-admin disable', async () => {
      prismaMock.user.findUnique.mockResolvedValue(admin({ id: 'admin-1' }));
      await expect(
        service.setDisabled('admin-1', 'admin-1', true),
      ).rejects.toBeInstanceOf(ForbiddenException);

      prismaMock.user.findUnique.mockResolvedValue(admin());
      prismaMock.user.count.mockResolvedValue(0);
      await expect(
        service.setDisabled('admin-1', 'admin-2', true),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects no-op toggles', async () => {
      prismaMock.user.findUnique.mockResolvedValue(partner());
      await expect(
        service.setDisabled('admin-1', 'user-1', false),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('list', () => {
    it('applies filters and returns role counts', async () => {
      prismaMock.user.findMany.mockResolvedValue([partner()]);
      prismaMock.user.count.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
      prismaMock.user.groupBy.mockResolvedValue([
        { role: UserRole.PARTNER, _count: { _all: 4 } },
      ]);

      const res = await service.list({
        role: UserRole.PARTNER,
        status: 'active',
        search: ' x ',
        take: 500,
      });

      const args = prismaMock.user.findMany.mock.calls[0][0];
      expect(args.take).toBe(100);
      expect(args.where.role).toBe(UserRole.PARTNER);
      expect(args.where.disabledAt).toBeNull();
      expect(args.where.OR).toHaveLength(2);
      expect(res.roleCounts.PARTNER).toBe(4);
      expect(res.roleCounts.BUYER).toBe(0);
      expect(res.activeAdmins).toBe(2);
    });
  });
});
