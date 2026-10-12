import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { User, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  initialVerificationStatus,
  roleForAccountType,
} from './account-type.util';
import {
  AuthTokensResponse,
  AuthUserResponse,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from './dto/auth.dto';
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
            companyName: dto.companyName,
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
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(dto.refreshToken);
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
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueTokens(user);
  }

  async logout(userId: string, dto: RefreshTokenDto): Promise<void> {
    const tokenHash = this.hashToken(dto.refreshToken);
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
