import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ACCESS_COOKIE } from '../auth-cookies';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AuthenticatedUser, JwtPayload } from '../types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const cookies = req.cookies as Record<string, string> | undefined;
          if (cookies?.[ACCESS_COOKIE]) return cookies[ACCESS_COOKIE];
          return ExtractJwt.fromAuthHeaderAsBearerToken()(req) ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });
    if (!user || user.disabledAt || user.deletedAt) {
      throw new UnauthorizedException();
    }
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      orgId: user.organization?.id,
      verification: user.organization?.verificationStatus,
    };
  }
}
