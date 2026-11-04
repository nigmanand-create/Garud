import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AccountType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService (admin-managed accounts)', () => {
  let service: AuthService;
  let hash: string;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const baseUser = () => ({
    id: 'u1',
    email: 'ops@garudhub.in',
    passwordHash: hash,
    role: UserRole.PLATFORM_ADMIN,
    accountType: AccountType.TECHNOLOGY_COMPANY,
    mustChangePassword: true,
    disabledAt: null as Date | null,
    organization: null,
  });

  beforeAll(async () => {
    hash = await bcrypt.hash('TempPass-12345', 4);
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn(), verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: string) =>
              key === 'JWT_REFRESH_SECRET' ? 'refresh-secret' : fallback,
          },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('blocks login for a disabled account', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...baseUser(),
      disabledAt: new Date(),
    });
    await expect(
      service.login({ email: 'ops@garudhub.in', password: 'TempPass-12345' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('changes password, clears the temporary flag and revokes sessions', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue(baseUser());
    prismaMock.user.update.mockResolvedValue({
      ...baseUser(),
      mustChangePassword: false,
    });
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    const res = await service.changePassword('u1', {
      currentPassword: 'TempPass-12345',
      newPassword: 'BrandNewPass-678',
    });

    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(data.mustChangePassword).toBe(false);
    await expect(
      bcrypt.compare('BrandNewPass-678', data.passwordHash),
    ).resolves.toBe(true);
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
    expect(res.mustChangePassword).toBeUndefined();
  });

  it('rejects a wrong current password or an unchanged password', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue(baseUser());
    await expect(
      service.changePassword('u1', {
        currentPassword: 'wrong-password',
        newPassword: 'BrandNewPass-678',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.changePassword('u1', {
        currentPassword: 'TempPass-12345',
        newPassword: 'TempPass-12345',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('exposes mustChangePassword on /auth/me while the flag is set', async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue(baseUser());
    const me = await service.getMe('u1');
    expect(me.mustChangePassword).toBe(true);
  });
});
