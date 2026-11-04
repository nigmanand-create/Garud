import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import type { AuthTokensResponse } from './dto/auth.dto';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  resolveAuthSessionMode,
  setAuthCookies,
  stripTokensForResponse,
} from './auth-cookies';

export function applyAuthSession(
  req: Request,
  res: Response,
  config: ConfigService,
  tokens: AuthTokensResponse,
): AuthTokensResponse {
  const mode = resolveAuthSessionMode(config);
  if (mode === 'cookies' || mode === 'dual') {
    setAuthCookies(res, config, tokens);
  }
  return stripTokensForResponse(mode, tokens);
}

export function readRefreshTokenFromRequest(
  req: Request,
  bodyToken?: string,
): string | undefined {
  const fromBody = bodyToken?.trim();
  if (fromBody) return fromBody;
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[REFRESH_COOKIE]?.trim() || undefined;
}

export function clearAuthSession(
  res: Response,
  config: ConfigService,
): void {
  const mode = resolveAuthSessionMode(config);
  if (mode === 'cookies' || mode === 'dual') {
    clearAuthCookies(res, config);
  }
}
