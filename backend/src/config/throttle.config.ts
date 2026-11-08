/**
 * Env-tunable rate limits (per client IP, per window). Resolved at request time
 * (functions are accepted by @nestjs/throttler) so values from `.env` are honoured.
 *
 * Defaults match the original hard-coded limits (P0-SEC2). Tune after real traffic
 * — see docs/PRODUCTION_READINESS.md § Rate limits.
 */
function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

export const THROTTLE_DEFAULTS = {
  global: { limit: 120, ttlMs: 60_000 },
  /** register, login, change-password */
  auth: { limit: 10, ttlMs: 60_000 },
  /** refresh-token rotation (called silently by the SPA) */
  authRefresh: { limit: 30, ttlMs: 60_000 },
  /** POST /auth/otp/request (stricter; pair with OTP_* per-phone limits) */
  otpRequest: { limit: 5, ttlMs: 60_000 },
  /** public POST /enquiries */
  enquiry: { limit: 5, ttlMs: 60_000 },
} as const;

export type ThrottleBucket = keyof typeof THROTTLE_DEFAULTS;

const ENV_PREFIX: Record<ThrottleBucket, string> = {
  global: 'THROTTLE_GLOBAL',
  auth: 'THROTTLE_AUTH',
  authRefresh: 'THROTTLE_AUTH_REFRESH',
  otpRequest: 'THROTTLE_OTP_REQUEST',
  enquiry: 'THROTTLE_ENQUIRY',
};

export function throttleLimit(bucket: ThrottleBucket): number {
  return envInt(`${ENV_PREFIX[bucket]}_LIMIT`, THROTTLE_DEFAULTS[bucket].limit);
}

export function throttleTtl(bucket: ThrottleBucket): number {
  return envInt(
    `${ENV_PREFIX[bucket]}_TTL_MS`,
    THROTTLE_DEFAULTS[bucket].ttlMs,
  );
}

/** Options for `@Throttle({ default: throttleFor('auth') })`. */
export function throttleFor(bucket: ThrottleBucket) {
  return {
    limit: () => throttleLimit(bucket),
    ttl: () => throttleTtl(bucket),
  };
}
