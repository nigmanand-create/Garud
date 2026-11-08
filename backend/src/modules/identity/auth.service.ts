import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import {
  User,
  VerificationStatus,
  AccountType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  initialVerificationStatus,
  resolveCompanyNameForRegistration,
  roleForAccountType,
} from './account-type.util';
import {
  AuthTokensResponse,
  AuthUserResponse,
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  RegisterGoogleDto,
} from './dto/auth.dto';
import type { GoogleOAuthState } from './google-oauth.util';
import type { GoogleProfile } from './google-oauth.service';
import { JwtPayload } from './types/auth.types';

@Injectable()
export class AuthService {
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessExpiresIn = config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    this.refreshExpiresIn = config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshSecret = config.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    this.refreshSecret = refreshSecret;
  }

  async register(dto: RegisterDto): Promise<AuthTokensResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      if (existing.deletedAt) {
        throw new ConflictException(
          'This email was used by a removed account. Contact support or use a different email.',
        );
      }
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role = roleForAccountType(dto.accountType);
    const verificationStatus = initialVerificationStatus(dto.accountType);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role,
        accountType: dto.accountType,
        organization: {
          create: {
            companyName: resolveCompanyNameForRegistration(dto.accountType, {
              companyName: dto.companyName,
              contactPersonName: dto.contactPersonName,
              email: dto.email,
            }),
            country: dto.country,
            state: dto.state,
            city: dto.city,
            website: dto.website,
            contactPersonName: dto.contactPersonName,
            contactEmail: dto.contactEmail,
            contactMobile: dto.contactMobile,
            verificationStatus,
          },
        },
      },
      include: { organization: true },
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokensResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { organization: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('Sign in with Google for this account');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.deletedAt) {
      throw new UnauthorizedException('Account no longer exists');
    }
    if (user.disabledAt) {
      throw new UnauthorizedException('Account is disabled');
    }
    return this.issueTokens(user);
  }

  /** Issue JWT + refresh for an existing user (phone OTP and other secondary flows). */
  async createSessionForUser(userId: string): Promise<AuthTokensResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.deletedAt) {
      throw new UnauthorizedException('Account no longer exists');
    }
    if (user.disabledAt) {
      throw new UnauthorizedException('Account is disabled');
    }
    return this.issueTokens(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    const refreshToken = dto.refreshToken?.trim();
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        id: payload.jti,
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });
    if (!user || user.deletedAt || user.disabledAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueTokens(user);
  }

  async logout(userId: string, dto: RefreshTokenDto): Promise<void> {
    const refreshToken = dto.refreshToken?.trim();
    if (!refreshToken) return;
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async getMe(userId: string): Promise<AuthUserResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { organization: true },
    });
    return this.toUserResponse(user);
  }

  /** Self-service password change; clears the admin-issued temporary-password flag. */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<AuthUserResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { organization: true },
    });
    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account uses Google sign-in. Set a password from account settings when available.',
      );
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must differ from the current password',
      );
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: false },
        include: { organization: true },
      }),
      // Sign out other sessions after a credential change.
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return this.toUserResponse(updated);
  }

  /** Link or sign in with Google; may require completing registration. */
  async loginFromGoogle(
    profile: GoogleProfile,
    state: GoogleOAuthState,
  ): Promise<
    | { outcome: 'session'; tokens: AuthTokensResponse }
    | {
        outcome: 'pending';
        pending: {
          sub: string;
          email: string;
          displayName: string;
          accountType?: AccountType;
        };
      }
    | { outcome: 'error'; code: string }
  > {
    if (!profile.emailVerified) {
      return { outcome: 'error', code: 'email_not_verified' };
    }

    let user = await this.prisma.user.findUnique({
      where: { googleSub: profile.sub },
      include: { organization: true },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: profile.email },
        include: { organization: true },
      });
      if (user) {
        if (user.googleSub && user.googleSub !== profile.sub) {
          return { outcome: 'error', code: 'google_account_conflict' };
        }
        if (user.deletedAt) {
          return { outcome: 'error', code: 'no_account' };
        }
        if (user.disabledAt) {
          return { outcome: 'error', code: 'account_disabled' };
        }
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleSub: profile.sub },
          include: { organization: true },
        });
      }
    }

    if (user) {
      if (user.deletedAt) {
        return { outcome: 'error', code: 'no_account' };
      }
      if (user.disabledAt) {
        return { outcome: 'error', code: 'account_disabled' };
      }
      return { outcome: 'session', tokens: await this.issueTokens(user) };
    }

    if (state.mode !== 'register') {
      return { outcome: 'error', code: 'no_account' };
    }

    return {
      outcome: 'pending',
      pending: {
        sub: profile.sub,
        email: profile.email,
        displayName: profile.displayName,
        accountType: state.accountType,
      },
    };
  }

  async registerFromGoogle(
    pending: { sub: string; email: string; displayName: string },
    dto: RegisterGoogleDto,
  ): Promise<AuthTokensResponse> {
    if (dto.email.toLowerCase() !== pending.email) {
      throw new BadRequestException('Email must match your Google account');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: pending.email },
    });
    if (existing) {
      if (existing.deletedAt) {
        throw new ConflictException(
          'This email was used by a removed account. Contact support or use a different email.',
        );
      }
      throw new ConflictException('Email already registered');
    }

    const byGoogle = await this.prisma.user.findUnique({
      where: { googleSub: pending.sub },
    });
    if (byGoogle) {
      throw new ConflictException('Google account already linked');
    }

    const role = roleForAccountType(dto.accountType);
    if (role === UserRole.PLATFORM_ADMIN) {
      throw new BadRequestException('Invalid account type');
    }

    const verificationStatus = initialVerificationStatus(dto.accountType);
    const passwordHash =
      dto.password && dto.password.length >= 8
        ? await bcrypt.hash(dto.password, 12)
        : null;

    const user = await this.prisma.user.create({
      data: {
        email: pending.email,
        passwordHash,
        googleSub: pending.sub,
        role,
        accountType: dto.accountType,
        organization: {
          create: {
            companyName: resolveCompanyNameForRegistration(dto.accountType, {
              companyName: dto.companyName,
              contactPersonName: dto.contactPersonName,
              email: dto.email,
              displayName: pending.displayName,
            }),
            country: dto.country,
            state: dto.state,
            city: dto.city,
            website: dto.website,
            contactPersonName: dto.contactPersonName || pending.displayName,
            contactEmail: dto.contactEmail,
            contactMobile: dto.contactMobile,
            verificationStatus,
          },
        },
      },
      include: { organization: true },
    });

    return this.issueTokens(user);
  }

  private async issueTokens(
    user: User & {
      organization: {
        id: string;
        verificationStatus: VerificationStatus;
      } | null;
    },
  ): Promise<AuthTokensResponse> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      orgId: user.organization?.id,
      verification: user.organization?.verificationStatus,
    };

    const refreshRecord = await this.prisma.refreshToken.create({
      data: {
        tokenHash: 'pending',
        userId: user.id,
        expiresAt: this.refreshExpiryDate(),
      },
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti: refreshRecord.id },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as `${number}d`,
      },
    );

    await this.prisma.refreshToken.update({
      where: { id: refreshRecord.id },
      data: { tokenHash: this.hashToken(refreshToken) },
    });

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      expiresIn: this.accessExpiresIn as `${number}${'m' | 'h' | 'd'}`,
    });

    return {
      accessToken,
      refreshToken,
      user: this.toUserResponse(user),
    };
  }

  private toUserResponse(
    user: User & {
      organization: {
        id: string;
        verificationStatus: VerificationStatus;
        contactPersonName?: string;
      } | null;
    },
  ): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      orgId: user.organization?.id,
      verificationStatus: user.organization?.verificationStatus,
      contactPersonName:
        user.organization?.contactPersonName?.trim() || undefined,
      mustChangePassword: user.mustChangePassword || undefined,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshExpiryDate(): Date {
    const days = this.parseDurationDays(this.refreshExpiresIn);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private parseDurationDays(value: string): number {
    const match = /^(\d+)d$/i.exec(value.trim());
    if (match) {
      return parseInt(match[1], 10);
    }
    return 7;
  }

  /** Used by seed script */
  static generateRandomPassword(): string {
    return randomBytes(16).toString('base64url');
  }
}
