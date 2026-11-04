import type { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import type { AuthTokensResponse } from './dto/auth.dto';

export const ACCESS_COOKIE = 'garud_access';
export const REFRESH_COOKIE = 'garud_refresh';

export type AuthSessionMode = 'cookies' | 'bearer' | 'dual';

export function resolveAuthSessionMode(config: ConfigService): AuthSessionMode {
  const explicit = config.get<string>('AUTH_SESSION_MODE')?.trim().toLowerCase();
  if (explicit === 'cookies' || explicit === 'bearer' || explicit === 'dual') {
    return explicit;
  }
  if (config.get<string>('NODE_ENV') === 'test') {
    return 'bearer';
  }
  return 'cookies';
}

function cookieBase(config: ConfigService): CookieOptions {
  const secure =
    config.get<string>('AUTH_COOKIE_SECURE') === 'true' ||
    (config.get<string>('AUTH_COOKIE_SECURE') !== 'false' &&
      config.get<string>('NODE_ENV') === 'production');
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  tokens: Pick<AuthTokensResponse, 'accessToken' | 'refreshToken'>,
): void {
  const base = cookieBase(config);
  const accessMaxAge = parseDurationMs(
    config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    15 * 60 * 1000,
  );
  const refreshMaxAge = parseDurationMs(
    config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    7 * 24 * 60 * 60 * 1000,
  );
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: accessMaxAge,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: refreshMaxAge,
  });
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const base = cookieBase(config);
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}

export function stripTokensForResponse(
  mode: AuthSessionMode,
  tokens: AuthTokensResponse,
): AuthTokensResponse {
  if (mode === 'bearer' || mode === 'dual') {
    return tokens;
  }
  return {
    user: tokens.user,
    accessToken: '',
    refreshToken: '',
  };
}

/** Parse JWT-style durations (15m, 7d, 12h) to milliseconds for cookie maxAge. */
function parseDurationMs(raw: string, fallback: number): number {
  const m = /^(\d+)([smhd])$/i.exec(raw.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 10);
  switch (m[2].toLowerCase()) {
    case 's':
      return n * 1000;
    case 'm':
      return n * 60 * 1000;
    case 'h':
      return n * 60 * 60 * 1000;
    case 'd':
      return n * 24 * 60 * 60 * 1000;
    default:
      return fallback;
  }
}
