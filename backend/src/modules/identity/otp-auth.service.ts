import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuthService } from './auth.service';
import { AuthTokensResponse } from './dto/auth.dto';
import { normalizeIndiaPhoneToE164 } from './phone.util';
import { SmsService } from './sms.service';

@Injectable()
export class OtpAuthService {
  private readonly logger = new Logger(OtpAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
    private readonly authService: AuthService,
  ) {}

  async requestOtp(
    rawPhone: string,
  ): Promise<{ sent: boolean; devOtpLogged?: boolean }> {
    const phone = normalizeIndiaPhoneToE164(rawPhone);
    if (!phone) {
      throw new UnauthorizedException('Invalid phone number');
    }

    const user = await this.findUserByPhone(phone);
    if (!user) {
      throw new NotFoundException('No account found for this number');
    }
    if (user.deletedAt) {
      throw new NotFoundException('No account found for this number');
    }
    if (user.disabledAt) {
      throw new UnauthorizedException('Account is disabled');
    }

    await this.enforcePhoneRateLimit(phone);

    const code = this.generateCode();
    const codeHash = this.hashOtpCode(phone, code);
    const ttlSec = this.otpTtlSeconds();
    const expiresAt = new Date(Date.now() + ttlSec * 1000);

    await this.prisma.otpChallenge.create({
      data: { phoneE164: phone, codeHash, expiresAt },
    });

    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (this.sms.isConfigured()) {
      const result = await this.sms.sendOtp(phone, code);
      if (!result.ok) {
        this.logger.warn(`SMS send failed (${result.error}) for ${phone}`);
        if (isProduction) {
          throw new ServiceUnavailableException(
            'SMS could not be sent. Try again later or use another sign-in method.',
          );
        }
        this.logger.log(`[dev fallback] OTP for ${phone}: ${code}`);
        return { sent: false, devOtpLogged: true };
      }
      return { sent: true };
    }

    if (isProduction) {
      throw new ServiceUnavailableException(
        'Phone sign-in is not configured (SMS_PROVIDER / gateway keys missing).',
      );
    }

    this.logger.log(`[dev] OTP for ${phone}: ${code}`);
    return { sent: false, devOtpLogged: true };
  }

  async verifyOtpAndLogin(
    rawPhone: string,
    code: string,
  ): Promise<AuthTokensResponse> {
    const phone = normalizeIndiaPhoneToE164(rawPhone);
    if (!phone) {
      throw new UnauthorizedException('Invalid phone number');
    }
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      throw new UnauthorizedException('Invalid code');
    }

    const user = await this.findUserByPhone(phone);
    if (!user) {
      throw new NotFoundException('No account found for this number');
    }
    if (user.deletedAt) {
      throw new NotFoundException('No account found for this number');
    }
    if (user.disabledAt) {
      throw new UnauthorizedException('Account is disabled');
    }

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { phoneE164: phone, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) {
      throw new UnauthorizedException(
        'Code expired or not found. Request a new code.',
      );
    }

    const expectedHash = this.hashOtpCode(phone, trimmed);
    if (challenge.codeHash !== expectedHash) {
      throw new UnauthorizedException('Invalid code');
    }

    await this.prisma.$transaction([
      this.prisma.otpChallenge.deleteMany({ where: { phoneE164: phone } }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          phoneE164: phone,
          phoneVerifiedAt: user.phoneVerifiedAt ?? new Date(),
        },
      }),
    ]);

    return this.authService.createSessionForUser(user.id);
  }

  private async findUserByPhone(phoneE164: string): Promise<{
    id: string;
    disabledAt: Date | null;
    deletedAt: Date | null;
    phoneVerifiedAt: Date | null;
    phoneE164: string | null;
  } | null> {
    const selectUser = {
      id: true,
      disabledAt: true,
      deletedAt: true,
      phoneVerifiedAt: true,
      phoneE164: true,
    } as const;

    const byUser = await this.prisma.user.findFirst({
      where: { phoneE164 },
      select: selectUser,
    });
    if (byUser) return byUser;

    const mobileLocal = phoneE164.replace(/^\+91/, '');
    const byOrg = await this.prisma.user.findFirst({
      where: {
        organization: {
          contactMobile: { contains: mobileLocal, mode: 'insensitive' },
        },
      },
      select: selectUser,
    });
    return byOrg;
  }

  private async enforcePhoneRateLimit(phone: string): Promise<void> {
    const windowMin = Math.max(
      1,
      Number(this.config.get<string>('OTP_PHONE_WINDOW_MIN') ?? '60') || 60,
    );
    const maxPerWindow = Math.max(
      1,
      Number(this.config.get<string>('OTP_MAX_PER_PHONE_PER_WINDOW') ?? '5') ||
        5,
    );
    const since = new Date(Date.now() - windowMin * 60 * 1000);
    const count = await this.prisma.otpChallenge.count({
      where: { phoneE164: phone, createdAt: { gte: since } },
    });
    if (count >= maxPerWindow) {
      throw new UnauthorizedException(
        'Too many codes for this number. Wait before trying again.',
      );
    }
  }

  private generateCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private otpTtlSeconds(): number {
    const raw = this.config.get<string>('OTP_TTL_SECONDS') ?? '600';
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 60 && n <= 3600 ? n : 600;
  }

  private hashOtpCode(phoneE164: string, code: string): string {
    const pepper =
      this.config.get<string>('OTP_CODE_PEPPER')?.trim() ||
      this.config.get<string>('JWT_REFRESH_SECRET', '') ||
      'otp-pepper-unset';
    return createHash('sha256')
      .update(`${pepper}|${phoneE164}|${code}`)
      .digest('hex');
  }
}
