import { createHash, randomUUID } from 'crypto';
import type { Request, Response } from 'express';

export const VISITOR_SESSION_COOKIE = 'garud_visitor';

const VISITOR_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() || req.ip || 'unknown';
  }
  return req.ip || 'unknown';
}

/** Stable per-browser key: session cookie when present, else IP + user-agent hash. */
export function resolveVisitorKey(req: Request): string {
  const fromCookie = req.cookies?.[VISITOR_SESSION_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie.length >= 8) {
    return fromCookie.slice(0, 64);
  }
  const ua = req.headers['user-agent'] ?? '';
  return createHash('sha256')
    .update(`${clientIp(req)}|${ua}`)
    .digest('hex')
    .slice(0, 64);
}

/** Visitor key for listing analytics: session cookie, or IP+UA hash with cookie issued for next visit. */
export function visitorKeyForListingView(req: Request, res: Response): string {
  const fromCookie = req.cookies?.[VISITOR_SESSION_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie.length >= 8) {
    return fromCookie.slice(0, 64);
  }
  const hashed = resolveVisitorKey(req);
  const secure = process.env.NODE_ENV === 'production';
  res.cookie(VISITOR_SESSION_COOKIE, hashed, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: VISITOR_COOKIE_MAX_AGE_MS,
    path: '/',
  });
  return hashed;
}
