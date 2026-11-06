import type { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

/** Shared httpOnly cookie defaults for OAuth pending state. */
export function cookieBaseFromConfig(config: ConfigService): CookieOptions {
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
